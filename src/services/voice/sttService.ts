import { STTConfig } from '../../types/voice';

export interface STTCallbacks {
  onInterimResult?: (transcript: string) => void;
  onFinalResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class STTService {
  private activeRecognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private listening = false;

  public isListening(): boolean {
    return this.listening;
  }

  /**
   * Start speech-to-text listening using either Web Speech Recognition or Whisper recording.
   */
  public async startListening(
    config: STTConfig,
    callbacks: STTCallbacks
  ): Promise<void> {
    this.stopListening();

    const engine = config.engine || 'webspeech';

    if (engine === 'webspeech') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        callbacks.onError?.('Web Speech Recognition is not supported in this environment.');
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        this.activeRecognition = recognition;
        recognition.continuous = config.continuous ?? false;
        recognition.interimResults = true;
        recognition.lang = config.language || 'fa-IR';

        recognition.onstart = () => {
          this.listening = true;
          callbacks.onStart?.();
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const part = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += part;
            } else {
              interim += part;
            }
          }

          if (interim) {
            callbacks.onInterimResult?.(interim);
          }
          if (final) {
            callbacks.onFinalResult(final);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('STT WebSpeech error:', event.error);
          this.listening = false;
          callbacks.onError?.(event.error || 'Speech recognition error');
        };

        recognition.onend = () => {
          this.listening = false;
          this.activeRecognition = null;
          callbacks.onEnd?.();
        };

        recognition.start();
      } catch (err: any) {
        console.error('Failed to start SpeechRecognition:', err);
        callbacks.onError?.(err.message || 'Failed to start speech recognition');
      }
    } else if (engine === 'whisper_openai' || engine === 'custom_whisper') {
      // Audio capture via MediaRecorder and transcribe with Whisper API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        callbacks.onError?.('Microphone access is not supported in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaStream = stream;
        this.audioChunks = [];

        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/ogg';

        const recorder = new MediaRecorder(stream, { mimeType });
        this.mediaRecorder = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        recorder.onstart = () => {
          this.listening = true;
          callbacks.onStart?.();
        };

        recorder.onstop = async () => {
          this.listening = false;
          callbacks.onEnd?.();

          // Stop all audio tracks
          stream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;

          if (this.audioChunks.length === 0) return;

          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.audioChunks = [];

          try {
            const endpoint =
              engine === 'custom_whisper' && config.customEndpoint
                ? config.customEndpoint
                : 'https://api.openai.com/v1/audio/transcriptions';

            const formData = new FormData();
            const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'ogg';
            formData.append('file', audioBlob, `speech.${ext}`);
            formData.append('model', 'whisper-1');

            if (config.language && config.language !== 'auto') {
              formData.append('language', config.language.split('-')[0]);
            }

            const headers: Record<string, string> = {};
            if (config.openaiApiKey) {
              headers['Authorization'] = `Bearer ${config.openaiApiKey.trim()}`;
            }

            const res = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: formData,
            });

            if (!res.ok) {
              const err = await res.text();
              throw new Error(`Whisper STT error (${res.status}): ${err}`);
            }

            const data = await res.json();
            const text = data.text || '';
            if (text.trim()) {
              callbacks.onFinalResult(text.trim());
            }
          } catch (err: any) {
            console.error('Whisper transcription failed:', err);
            callbacks.onError?.(err.message || 'Whisper transcription failed');
          }
        };

        recorder.start();
      } catch (err: any) {
        console.error('Microphone capture error:', err);
        callbacks.onError?.(err.message || 'Could not access microphone');
      }
    }
  }

  /**
   * Stop listening or recording.
   */
  public stopListening(): void {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch {
        // Ignore
      }
      this.activeRecognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore
      }
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.listening = false;
  }
}

export const sttService = new STTService();
