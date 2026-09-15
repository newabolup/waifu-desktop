import { ProviderDiagnosticLog } from '../../types/provider';

type LogListener = (logs: ProviderDiagnosticLog[]) => void;

class DiagnosticLoggerService {
  private static instance: DiagnosticLoggerService;
  private logs: ProviderDiagnosticLog[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 50;

  private constructor() {}

  public static getInstance(): DiagnosticLoggerService {
    if (!DiagnosticLoggerService.instance) {
      DiagnosticLoggerService.instance = new DiagnosticLoggerService();
    }
    return DiagnosticLoggerService.instance;
  }

  public addLog(log: Omit<ProviderDiagnosticLog, 'id' | 'timestamp'>): ProviderDiagnosticLog {
    const fullLog: ProviderDiagnosticLog = {
      ...log,
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };

    this.logs.unshift(fullLog);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.notify();
    return fullLog;
  }

  public getLogs(): ProviderDiagnosticLog[] {
    return [...this.logs];
  }

  public getLogsForProvider(providerId: string): ProviderDiagnosticLog[] {
    return this.logs.filter((l) => l.providerId === providerId);
  }

  public clearLogs(): void {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const current = this.getLogs();
    this.listeners.forEach((l) => l(current));
  }

  public analyzeWhy(status?: number, message?: string, requestBody?: any): string {
    const lower = (message || '').toLowerCase();

    // 1. Minimum output tokens error (Muse / Gemini / Anthropic gateways)
    if (
      lower.includes('max_output_tokens') &&
      (lower.includes('>= 16') || lower.includes('16') || lower.includes('minimum'))
    ) {
      return 'The upstream provider router requires "max_output_tokens" to be at least 16 tokens. Minimal probe requests with max_tokens < 16 are rejected by this backend.';
    }

    // 2. Authentication failure
    if (
      status === 401 ||
      lower.includes('invalid_api_key') ||
      lower.includes('unauthorized') ||
      lower.includes('authentication')
    ) {
      return 'Authentication failed (401): The provider rejected the API key. Verify that your Bearer token / API key is active, properly copied, and has not expired.';
    }

    // 3. Nonexistent model
    if (
      status === 404 ||
      lower.includes('model_not_found') ||
      lower.includes('does not exist') ||
      lower.includes('not found')
    ) {
      return 'Model not found (404): The model name specified in settings is not registered or deployed on this endpoint. Check the exact model identifier from the provider console.';
    }

    // 4. Rate limits / Quota
    if (
      status === 429 ||
      lower.includes('rate limit') ||
      lower.includes('quota') ||
      lower.includes('insufficient_quota')
    ) {
      return 'Rate limit or balance exhausted (429): You have sent too many requests in a short time or your provider account has run out of credits/tokens.';
    }

    // 5. Invalid Request syntax
    if (status === 400) {
      return `Invalid Request (400): The upstream AI server rejected one of the request parameters. Server response: "${message}".`;
    }

    // 6. Upstream server failure
    if (status && status >= 500) {
      return `Upstream Gateway Error (${status}): The remote AI server encountered an internal crash or temporary downtime.`;
    }

    // 7. Network / connection refused
    if (lower.includes('failed to fetch') || lower.includes('econnrefused')) {
      return 'Network Connection Error: Could not connect to the target endpoint. If running locally (LM Studio / Ollama), ensure the server is active and CORS is allowed. If remote, check your internet connection and URL spelling.';
    }

    // 8. Timeout
    if (lower.includes('timeout')) {
      return 'Timeout: The server did not respond within the configured timeout window. The remote model might be overloaded or cold-starting.';
    }

    // 9. Success
    if (status === 200) {
      return 'Request succeeded (200 OK): The provider accepted the parameters and successfully streamed the completion response.';
    }

    return message || 'No detailed error message provided by endpoint.';
  }
}

export const diagnosticLogger = DiagnosticLoggerService.getInstance();
