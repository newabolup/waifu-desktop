export interface AIProviderConfig {
  id: string;
  name: string;
  baseUrl: string; // e.g. "https://api.openai.com/v1" or "http://localhost:1234/v1"
  apiKey?: string;
  model: string;
  customHeaders?: Record<string, string>;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextWindow: number;
  enableReasoning?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
  timeoutMs: number;
  retryCount: number;
  fallbackProviderId?: string;
  isActive: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  availableModels?: string[];
  streamingSupported?: boolean;
}

export interface StreamChunkCallbacks {
  onChunk: (delta: string) => void;
  onThought?: (thoughtDelta: string) => void;
  onError: (error: Error) => void;
  onComplete: (fullContent: string, fullThoughts?: string) => void;
}
