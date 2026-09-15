import { AIProviderConfig, ConnectionTestResult } from '../../types/provider';

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

  // 2. Perform minimal 1-token streaming chat completion test
  const chatUrl = cleanBase.endsWith('/chat/completions')
    ? cleanBase
    : `${cleanBase}/chat/completions`;

  try {
    const testBody = {
      model: provider.model,
      messages: [{ role: 'user', content: 'Ping' }],
      max_tokens: 2,
      stream: true,
    };

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

      if (res.status === 401) {
        return {
          success: false,
          message: `Authentication failed (401). Please check your API key: ${errorMsg}`,
          latencyMs,
        };
      } else if (res.status === 404) {
        return {
          success: false,
          message: `Model "${provider.model}" not found or endpoint invalid (404): ${errorMsg}`,
          latencyMs,
          availableModels: availableModels.length > 0 ? availableModels : undefined,
        };
      } else if (res.status === 429) {
        return {
          success: false,
          message: `Rate limit reached or quota exceeded (429): ${errorMsg}`,
          latencyMs,
        };
      }

      return {
        success: false,
        message: `HTTP Error ${res.status}: ${errorMsg}`,
        latencyMs,
      };
    }

    // Verify streaming chunks
    let streamingSupported = false;
    if (res.body) {
      const reader = res.body.getReader();
      const firstChunk = await reader.read();
      if (!firstChunk.done && firstChunk.value) {
        const chunkText = new TextDecoder().decode(firstChunk.value);
        if (chunkText.includes('data:')) {
          streamingSupported = true;
        }
      }
      reader.cancel();
    }

    return {
      success: true,
      message: `Successfully connected to ${provider.model}! Latency: ${latencyMs}ms. Streaming is operational.`,
      latencyMs,
      availableModels: availableModels.length > 0 ? availableModels : undefined,
      streamingSupported,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    let msg = err.message || 'Connection failed';

    if (msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
      msg = `Cannot connect to server at ${provider.baseUrl}. If this is a local model (e.g. LM Studio or Ollama), verify the server is running and CORS is enabled.`;
    } else if (msg.includes('timeout') || err.name === 'TimeoutError') {
      msg = `Request timed out after ${provider.timeoutMs || 20000}ms. The model endpoint is not responding.`;
    }

    return {
      success: false,
      message: msg,
      latencyMs,
      availableModels: availableModels.length > 0 ? availableModels : undefined,
    };
  }
}
