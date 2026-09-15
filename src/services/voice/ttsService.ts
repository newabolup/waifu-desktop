import { TTSConfig } from '../../types/voice';

export class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;

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
        this.currentAudio = new Audio(url);

        this.currentAudio.onended = () => {
          this.isSpeaking = false;
          onEnd?.();
        };

        await this.currentAudio.play();
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
        this.currentAudio = new Audio(url);

        this.currentAudio.onended = () => {
          this.isSpeaking = false;
          onEnd?.();
        };

        await this.currentAudio.play();
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
