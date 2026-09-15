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

export interface ProviderDiagnosticLog {
  id: string;
  timestamp: number;
  type: 'test_connection' | 'chat_completion' | 'models_probe';
  providerId: string;
  providerName: string;
  endpoint: string;
  model: string;
  requestHeaders: Record<string, string>;
  requestBody: any;
  status?: number;
  statusText?: string;
  responseRaw?: string;
  parsedError?: string;
  latencyMs: number;
  success: boolean;
  whyAnalysis: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  availableModels?: string[];
  streamingSupported?: boolean;
  diagnosticLog?: ProviderDiagnosticLog;
}

export interface StreamChunkCallbacks {
  onChunk: (delta: string) => void;
  onThought?: (thoughtDelta: string) => void;
  onError: (error: Error) => void;
  onComplete: (fullContent: string, fullThoughts?: string) => void;
}
