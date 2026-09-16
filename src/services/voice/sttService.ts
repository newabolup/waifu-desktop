import { STTConfig } from '../../types/voice';

export interface STTCallbacks {
  onInterimResult?: (transcript: string) => void;
  onFinalResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void;
}

export class STTService {
  private activeRecognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private animFrameId: number | null = null;
  private listening = false;

  public isListening(): boolean {
    return this.listening;
  }

  /**
   * Helper to resolve Fish Audio API key from sttConfig or fallback to ttsConfig in localStorage
   */
  private getEffectiveFishApiKey(config: STTConfig): string {
    if (config.fishAudioApiKey && config.fishAudioApiKey.trim()) {
      return config.fishAudioApiKey.trim();
    }
    try {
      const savedTts = localStorage.getItem('kizuna_tts_config');
      if (savedTts) {
        const parsed = JSON.parse(savedTts);
        if (parsed.fishAudioApiKey && parsed.fishAudioApiKey.trim()) {
          return parsed.fishAudioApiKey.trim();
        }
      }
    } catch {
      // Ignore
    }
    return '';
  }

  /**
   * Helper to resolve OpenAI API key from sttConfig or fallback to localStorage
   */
  private getEffectiveOpenaiApiKey(config: STTConfig): string {
    if (config.openaiApiKey && config.openaiApiKey.trim()) {
      return config.openaiApiKey.trim();
    }
    try {
      const savedTts = localStorage.getItem('kizuna_tts_config');
      if (savedTts) {
        const parsed = JSON.parse(savedTts);
        if (parsed.openaiApiKey && parsed.openaiApiKey.trim()) {
          return parsed.openaiApiKey.trim();
        }
      }
    } catch {
      // Ignore
    }
    return '';
  }

  /**
   * Start speech-to-text listening using MediaRecorder (Fish Audio / Whisper) or Web Speech API.
   */
  public async startListening(
    config: STTConfig,
    callbacks: STTCallbacks
  ): Promise<void> {
    this.stopListening();

    const engine = config.engine || 'microphone';

    if (engine === 'webspeech') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        // Fallback to microphone recorder if Web Speech API isn't present
        return this.startMicrophoneRecording(config, callbacks);
      }

      try {
        const recognition = new SpeechRecognition();
        this.activeRecognition = recognition;
        recognition.continuous = config.continuous ?? false;
        recognition.interimResults = true;
        recognition.lang = config.language === 'fa' ? 'fa-IR' : config.language || 'fa-IR';

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
          // In Electron, Google Speech API is unavailable and returns 'network'. Fallback to microphone recorder!
          if (event.error === 'network' || event.error === 'service-not-allowed') {
            console.log('WebSpeech unavailable in this environment, falling back to microphone recorder...');
            this.activeRecognition = null;
            this.startMicrophoneRecording(config, callbacks);
            return;
          }
          callbacks.onError?.(event.error || 'Speech recognition error');
        };

        recognition.onend = () => {
          this.listening = false;
          this.activeRecognition = null;
          callbacks.onEnd?.();
        };

        recognition.start();
      } catch (err: any) {
        console.warn('Failed to start SpeechRecognition, falling back to microphone recording:', err);
        return this.startMicrophoneRecording(config, callbacks);
      }
    } else {
      // Default: Direct microphone recording via MediaRecorder
      return this.startMicrophoneRecording(config, callbacks);
    }
  }

  /**
   * Direct microphone capture using MediaRecorder.
   * Transcribes via Fish Audio ASR or OpenAI Whisper when recording stops.
   */
  private async startMicrophoneRecording(
    config: STTConfig,
    callbacks: STTCallbacks
  ): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      callbacks.onError?.('Microphone access is not supported in this environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
      this.audioChunks = [];

      // Audio level analyser for visual feedback
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          this.audioContext = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkLevel = () => {
            if (!this.listening) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            callbacks.onAudioLevel?.(Math.min(1.0, avg / 128));
            this.animFrameId = requestAnimationFrame(checkLevel);
          };
          this.animFrameId = requestAnimationFrame(checkLevel);
        }
      } catch (e) {
        console.warn('Audio level analyser not initialized:', e);
      }

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

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

        // Stop media stream tracks
        stream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;

        if (this.audioContext) {
          this.audioContext.close().catch(() => {});
          this.audioContext = null;
        }
        if (this.animFrameId) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }

        if (this.audioChunks.length === 0) return;

        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.audioChunks = [];

        // Check file size (at least ~1KB to be valid voice)
        if (audioBlob.size < 1000) {
          callbacks.onError?.('Audio recording too short. Please speak again.');
          return;
        }

        // Perform transcription
        await this.transcribeAudioBlob(audioBlob, mimeType, config, callbacks);
      };

      recorder.start(250); // Slice every 250ms
    } catch (err: any) {
      console.error('Microphone capture error:', err);
      callbacks.onError?.(err.message || 'Could not access microphone');
    }
  }

  /**
   * Transcribes recorded audio via Fish Audio ASR or OpenAI Whisper
   */
  private async transcribeAudioBlob(
    blob: Blob,
    mimeType: string,
    config: STTConfig,
    callbacks: STTCallbacks
  ): Promise<void> {
    const fishKey = this.getEffectiveFishApiKey(config);
    const openaiKey = this.getEffectiveOpenaiApiKey(config);
    const lang = config.language || 'fa';

    // 1. Try Fish Audio ASR if Fish Audio API key is available
    if (fishKey && (config.engine === 'fish_audio_asr' || config.engine === 'microphone' || !openaiKey)) {
      try {
        callbacks.onInterimResult?.('در حال تبدیل صوت با Fish Audio...');
        const formData = new FormData();
        const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'ogg';
        formData.append('audio', blob, `speech.${ext}`);
        formData.append('file', blob, `speech.${ext}`);
        if (lang && lang !== 'auto') {
          formData.append('language', lang);
        }

        const res = await fetch('https://api.fish.audio/v1/asr', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${fishKey}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Fish Audio ASR (${res.status}): ${errBody || res.statusText}`);
        }

        const data = await res.json();
        const text = data.text || '';
        if (text.trim()) {
          callbacks.onFinalResult(text.trim());
          return;
        }
      } catch (err: any) {
        console.warn('Fish Audio ASR failed, checking OpenAI Whisper fallback:', err);
        if (!openaiKey) {
          callbacks.onError?.(`Fish Audio ASR: ${err.message}`);
          return;
        }
      }
    }

    // 2. Try OpenAI Whisper if OpenAI key is available
    if (openaiKey) {
      try {
        callbacks.onInterimResult?.('در حال تبدیل صوت با Whisper...');
        const formData = new FormData();
        const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'ogg';
        formData.append('file', blob, `speech.${ext}`);
        formData.append('model', 'whisper-1');
        if (lang && lang !== 'auto') {
          formData.append('language', lang.split('-')[0]);
        }

        const endpoint =
          config.engine === 'custom_whisper' && config.customEndpoint
            ? config.customEndpoint
            : 'https://api.openai.com/v1/audio/transcriptions';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Whisper Error (${res.status}): ${errBody}`);
        }

        const data = await res.json();
        const text = data.text || '';
        if (text.trim()) {
          callbacks.onFinalResult(text.trim());
          return;
        }
      } catch (err: any) {
        console.error('Whisper transcription failed:', err);
        callbacks.onError?.(err.message || 'Whisper transcription failed');
        return;
      }
    }

    // 3. Free STT engine (Zero API keys required! Completely free out of the box)
    callbacks.onInterimResult?.('در حال پردازش صوت با موتور رایگان...');

    // A. Try Hugging Face Serverless Whisper (Free)
    try {
      const hfEndpoints = [
        'https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo',
        'https://api-inference.huggingface.co/models/openai/whisper-tiny',
      ];

      for (const ep of hfEndpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            body: blob,
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.text || '';
            if (text.trim()) {
              callbacks.onFinalResult(text.trim());
              return;
            }
          }
        } catch {
          // Try next
        }
      }
    } catch (e) {
      console.warn('Free online Whisper error:', e);
    }

    // B. Try Local In-Browser / Electron Transformers.js Whisper
    try {
      callbacks.onInterimResult?.('در حال اجرای پردازشگر صوتی محلی...');
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowLocalModels = false;

      const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx({ sampleRate: 16000 });
        const arrayBuf = await blob.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(arrayBuf);
        const channelData = decoded.getChannelData(0);

        const out: any = await transcriber(channelData, {
          language: lang === 'fa' ? 'persian' : lang,
          task: 'transcribe',
        });

        const text = typeof out === 'string' ? out : out?.text || '';
        if (text.trim()) {
          callbacks.onFinalResult(text.trim());
          return;
        }
      }
    } catch (localErr) {
      console.warn('Local Transformers.js whisper error:', localErr);
    }

    callbacks.onError?.('صدا دریافت شد اما پردازشگر آنلاین در دسترس نبود. لطفاً دوباره امتحان کنید.');
  }

  /**
   * Stop listening / recording immediately and trigger transcription.
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

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.listening = false;
  }
}

export const sttService = new STTService();
