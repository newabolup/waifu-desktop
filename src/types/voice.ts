export type TTSEngineType = 'webspeech' | 'openai' | 'custom_http';

export interface TTSConfig {
  engine: TTSEngineType;
  autoSpeak: boolean;
  voiceId: string;
  speed: number; // 0.5 to 2.0
  pitch: number; // 0.5 to 1.5
  openaiApiKey?: string;
  openaiVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  customEndpoint?: string;
  customHeaders?: Record<string, string>;
}
