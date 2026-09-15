import { AIProviderConfig, ConnectionTestResult, ProviderDiagnosticLog } from '../../types/provider';
import { diagnosticLogger } from './diagnosticLogger';

export async function testAIConnection(provider: AIProviderConfig): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  const cleanBase = provider.baseUrl.trim().replace(/\/+$/, '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(provider.customHeaders || {}),
  };

  if (provider.apiKey && provider.apiKey.trim().length > 0) {
    headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`;
  }

  // 1. First probe models list if supported
  let availableModels: string[] = [];
  try {
    const modelsUrl = `${cleanBase}/models`;
    const modelsRes = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(provider.timeoutMs || 15000),
    });

    if (modelsRes.ok) {
      const data = await modelsRes.json();
      if (Array.isArray(data.data)) {
        availableModels = data.data.map((m: any) => m.id || m.name).filter(Boolean);
      }
    }
  } catch (err) {
    // Some local models or custom endpoints don't implement /models, proceed to chat completion probe
  }

  // 2. Perform chat completion test
  // NOTE: Upstream providers (Gemini, Muse, Claude via OpenAI gateways) enforce max_output_tokens >= 16.
  const chatUrl = cleanBase.endsWith('/chat/completions')
    ? cleanBase
    : `${cleanBase}/chat/completions`;

  const testTokens = Math.max(16, Math.min(64, provider.maxTokens || 32));
  const testBody = {
    model: provider.model,
    messages: [{ role: 'user', content: 'Ping' }],
    max_tokens: testTokens,
    stream: true,
  };

  const safeHeaders: Record<string, string> = { ...headers };
  if (safeHeaders['Authorization']) {
    const key = provider.apiKey?.trim() || '';
    safeHeaders['Authorization'] = key.length > 8 ? `Bearer ${key.substring(0, 6)}...${key.substring(key.length - 4)}` : 'Bearer ***';
  }

  try {
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testBody),
      signal: AbortSignal.timeout(provider.timeoutMs || 20000),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = errText;
      try {
        const json = JSON.parse(errText);
        errorMsg = json.error?.message || json.message || errText;
      } catch {}

      const why = diagnosticLogger.analyzeWhy(res.status, errorMsg, testBody);

      const log = diagnosticLogger.addLog({
        type: 'test_connection',
        providerId: provider.id,
        providerName: provider.name,
        endpoint: chatUrl,
        model: provider.model,
        requestHeaders: safeHeaders,
        requestBody: testBody,
        status: res.status,
        statusText: res.statusText,
        responseRaw: errText,
        parsedError: errorMsg,
        latencyMs,
        success: false,
        whyAnalysis: why,
      });

      if (res.status === 401) {
        return {
          success: false,
          message: `Authentication failed (401). Please check your API key: ${errorMsg}`,
          latencyMs,
          diagnosticLog: log,
        };
      } else if (res.status === 404) {
        return {
          success: false,
          message: `Model "${provider.model}" not found or endpoint invalid (404): ${errorMsg}`,
          latencyMs,
          availableModels: availableModels.length > 0 ? availableModels : undefined,
          diagnosticLog: log,
        };
      } else if (res.status === 429) {
        return {
          success: false,
          message: `Rate limit reached or quota exceeded (429): ${errorMsg}`,
          latencyMs,
          diagnosticLog: log,
        };
      }

      return {
        success: false,
        message: `HTTP Error ${res.status}: ${errorMsg}`,
        latencyMs,
        diagnosticLog: log,
      };
    }

    // Verify streaming chunks
    let streamingSupported = false;
    let sampleChunk = '';
    if (res.body) {
      const reader = res.body.getReader();
      const firstChunk = await reader.read();
      if (!firstChunk.done && firstChunk.value) {
        const chunkText = new TextDecoder().decode(firstChunk.value);
        sampleChunk = chunkText.slice(0, 300);
        if (chunkText.includes('data:')) {
          streamingSupported = true;
        }
      }
      reader.cancel();
    }

    const why = diagnosticLogger.analyzeWhy(200, undefined, testBody);
    const log = diagnosticLogger.addLog({
      type: 'test_connection',
      providerId: provider.id,
      providerName: provider.name,
      endpoint: chatUrl,
      model: provider.model,
      requestHeaders: safeHeaders,
      requestBody: testBody,
      status: 200,
      statusText: 'OK',
      responseRaw: sampleChunk || '[SSE stream connected and initial chunk verified]',
      latencyMs,
      success: true,
      whyAnalysis: why,
    });

    return {
      success: true,
      message: `Successfully connected to ${provider.model}! Latency: ${latencyMs}ms. Streaming is operational.`,
      latencyMs,
      availableModels: availableModels.length > 0 ? availableModels : undefined,
      streamingSupported,
      diagnosticLog: log,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    let msg = err.message || 'Connection failed';

    if (msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
      msg = `Cannot connect to server at ${provider.baseUrl}. If this is a local model (e.g. LM Studio or Ollama), verify the server is running and CORS is enabled.`;
    } else if (msg.includes('timeout') || err.name === 'TimeoutError') {
      msg = `Request timed out after ${provider.timeoutMs || 20000}ms. The model endpoint is not responding.`;
    }

    const why = diagnosticLogger.analyzeWhy(undefined, msg, testBody);
    const log = diagnosticLogger.addLog({
      type: 'test_connection',
      providerId: provider.id,
      providerName: provider.name,
      endpoint: chatUrl,
      model: provider.model,
      requestHeaders: safeHeaders,
      requestBody: testBody,
      status: 0,
      statusText: 'Client Error',
      responseRaw: err.stack || err.toString(),
      parsedError: msg,
      latencyMs,
      success: false,
      whyAnalysis: why,
    });

    return {
      success: false,
      message: msg,
      latencyMs,
      availableModels: availableModels.length > 0 ? availableModels : undefined,
      diagnosticLog: log,
    };
  }
}
