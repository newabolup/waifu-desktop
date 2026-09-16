import { TTSConfig } from '../../types/voice';

export class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  /**
   * Retrieves available voices from browser Web Speech synthesis.
   */
  public async getWebSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }

    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };

      setTimeout(() => {
        resolve(window.speechSynthesis.getVoices());
      }, 500);
    });
  }

  /**
   * Cleans markdown, thoughts, and asterisks from speech text.
   */
  public cleanTextForSpeech(rawText: string): string {
    return rawText
      .replace(/<think>[\s\S]*?<\/think>/gi, '') // Strip thinking tags
      .replace(/```[\s\S]*?```/g, '')             // Strip code blocks
      .replace(/`[^`]+`/g, '')                     // Strip inline code
      .replace(/\*+[^*]+\*+/g, '')                 // Strip action asterisks (*smiles*, *pouts*)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // Strip markdown links
      .replace(/[#*_~`>-]/g, '')                   // Strip markdown symbols
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Attaches an AudioContext Analyser to an HTMLAudioElement for live lip-sync volume detection.
   */
  private setupAudioAnalyser(audio: HTMLAudioElement) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Create analyser
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      this.analyser = analyser;
      this.dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Connect source to analyser & destination
      const source = this.audioCtx.createMediaElementSource(audio);
      this.sourceNode = source;
      source.connect(analyser);
      analyser.connect(this.audioCtx.destination);
    } catch (err) {
      console.warn('AudioContext analyser hook failed (falling back to volume curve):', err);
    }
  }

  /**
   * Returns the current live audio volume (0.0 to 1.0) while audio is playing.
   */
  public getAudioVolume(): number {
    if (!this.isSpeaking) return 0.0;

    if (this.analyser && this.dataArray) {
      try {
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        const binCount = this.dataArray.length;
        for (let i = 0; i < binCount; i++) {
          sum += this.dataArray[i];
        }
        const avg = sum / binCount;
        return Math.min(1.0, avg / 80.0);
      } catch {
        // Fallback
      }
    }

    // Organic syllable simulation while speech is active
    const now = Date.now();
    const syllableWave = Math.sin(now * 0.015);
    if (syllableWave > -0.2) {
      return (Math.sin(now * 0.025) * 0.4 + 0.6) * 0.75;
    }
    return 0.05;
  }

  public async speak(
    text: string,
    config: TTSConfig,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    this.stop();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) return;

    if (config.engine === 'webspeech') {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = config.speed || 1.0;
      utterance.pitch = config.pitch || 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (config.voiceId) {
        const found = voices.find((v) => v.voiceURI === config.voiceId || v.name === config.voiceId);
        if (found) utterance.voice = found;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        onEnd?.();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        this.isSpeaking = false;
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } else if (config.engine === 'fish_audio') {
      try {
        onStart?.();
        this.isSpeaking = true;

        const endpoint = config.fishAudioEndpoint?.trim() || 'https://api.fish.audio/v1/tts';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'model': config.fishAudioModel || 's2.1-pro-free',
        };

        if (config.fishAudioApiKey && config.fishAudioApiKey.trim()) {
          headers['Authorization'] = `Bearer ${config.fishAudioApiKey.trim()}`;
        }

        const bodyPayload: Record<string, any> = {
          text: clean,
          format: 'mp3',
        };

        if (config.fishAudioModelId && config.fishAudioModelId.trim()) {
          bodyPayload.reference_id = config.fishAudioModelId.trim();
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Fish Audio TTS error (${res.status}): ${errText || res.statusText}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        this.currentAudio = audio;

        this.setupAudioAnalyser(audio);

        audio.onended = () => {
          this.isSpeaking = false;
          onEnd?.();
        };

        audio.onerror = (e) => {
          console.error('Fish Audio playback error:', e);
          this.isSpeaking = false;
          onEnd?.();
        };

        await audio.play();
      } catch (err) {
        console.error('Fish Audio TTS failure:', err);
        this.isSpeaking = false;
        onEnd?.();
      }
    } else if (config.engine === 'openai') {
      try {
        onStart?.();
        this.isSpeaking = true;

        const endpoint = 'https://api.openai.com/v1/audio/speech';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openaiApiKey || ''}`,
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: clean,
            voice: config.openaiVoice || 'nova',
            speed: config.speed || 1.0,
          }),
        });

        if (!res.ok) {
          throw new Error(`OpenAI TTS Error (${res.status})`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        this.currentAudio = audio;

        this.setupAudioAnalyser(audio);

        audio.onended = () => {
          this.isSpeaking = false;
          onEnd?.();
        };

        await audio.play();
      } catch (err) {
        console.error('TTS OpenAI failure:', err);
        this.isSpeaking = false;
        onEnd?.();
      }
    } else if (config.engine === 'custom_http' && config.customEndpoint) {
      try {
        onStart?.();
        this.isSpeaking = true;

        const res = await fetch(config.customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.customHeaders || {}),
          },
          body: JSON.stringify({
            text: clean,
            voice: config.voiceId,
            speed: config.speed,
          }),
        });

        if (!res.ok) throw new Error(`Custom TTS HTTP error: ${res.status}`);

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        this.currentAudio = audio;

        this.setupAudioAnalyser(audio);

        audio.onended = () => {
          this.isSpeaking = false;
          onEnd?.();
        };

        await audio.play();
      } catch (err) {
        console.error('Custom TTS failure:', err);
        this.isSpeaking = false;
        onEnd?.();
      }
    }
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    this.isSpeaking = false;
  }

  public getSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const ttsService = new TTSService();
