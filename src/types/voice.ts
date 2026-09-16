export type TTSEngineType = 'fish_audio' | 'webspeech' | 'openai' | 'custom_http';

export interface TTSConfig {
  engine: TTSEngineType;
  autoSpeak: boolean;
  voiceId: string;
  speed: number; // 0.5 to 2.0
  pitch: number; // 0.5 to 1.5
  // Fish Audio configuration
  fishAudioApiKey?: string;
  fishAudioModelId?: string; // reference_id
  fishAudioModel?: 's2.1-pro-free' | 's2.1-pro' | 's2-pro' | string;
  fishAudioEndpoint?: string; // defaults to https://api.fish.audio/v1/tts
  // OpenAI configuration
  openaiApiKey?: string;
  openaiVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  // Custom HTTP configuration
  customEndpoint?: string;
  customHeaders?: Record<string, string>;
}

export type STTEngineType = 'microphone' | 'fish_audio_asr' | 'whisper_openai' | 'webspeech' | 'custom_whisper';

export interface STTConfig {
  engine: STTEngineType;
  language: string; // 'fa', 'en', 'auto'
  continuous?: boolean;
  fishAudioApiKey?: string;
  openaiApiKey?: string;
  customEndpoint?: string;
}
