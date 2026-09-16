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
  fishAudioEndpoint?: string; // defaults to https://api.fish.audio/v1/tts
  // OpenAI configuration
  openaiApiKey?: string;
  openaiVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  // Custom HTTP configuration
  customEndpoint?: string;
  customHeaders?: Record<string, string>;
}

export type STTEngineType = 'webspeech' | 'whisper_openai' | 'custom_whisper';

export interface STTConfig {
  engine: STTEngineType;
  language: string; // 'fa-IR', 'en-US', etc.
  continuous?: boolean;
  openaiApiKey?: string;
  customEndpoint?: string;
}
