import { AIProviderConfig, StreamChunkCallbacks } from '../../types/provider';
import { PromptPayloadMessage } from '../../types/conversation';
import { StreamParser } from './streamParser';
import { diagnosticLogger } from './diagnosticLogger';

export interface PromptPayloadMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ProviderEngine {
  private activeAbortController: AbortController | null = null;

  /**
   * Send a streaming request to an OpenAI-compatible endpoint.
   */
  public async streamChat(
    provider: AIProviderConfig,
    messages: PromptPayloadMessage[],
    callbacks: StreamChunkCallbacks,
    fallbackProvider?: AIProviderConfig
  ): Promise<void> {
    this.stopGeneration(); // Cancel any existing active request
    this.activeAbortController = new AbortController();

    let fullContent = '';
    let fullThoughts = '';

    const executeAttempt = async (
      currentProvider: AIProviderConfig,
      attemptNumber: number
    ): Promise<void> => {
      const endpoint = this.normalizeChatEndpoint(currentProvider.baseUrl);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(currentProvider.customHeaders || {}),
      };

      if (currentProvider.apiKey && currentProvider.apiKey.trim().length > 0) {
        headers['Authorization'] = `Bearer ${currentProvider.apiKey.trim()}`;
      }

      const body: any = {
        model: currentProvider.model,
        messages: messages,
        temperature: currentProvider.temperature ?? 0.8,
        top_p: currentProvider.topP ?? 0.95,
        max_tokens: currentProvider.maxTokens ?? 2048,
        stream: true,
      };

      if (currentProvider.enableReasoning && currentProvider.reasoningEffort) {
        body['reasoning_effort'] = currentProvider.reasoningEffort;
      }

      const timeoutId = setTimeout(() => {
        if (this.activeAbortController) {
          this.activeAbortController.abort(new Error(`Request timed out after ${currentProvider.timeoutMs}ms`));
        }
      }, currentProvider.timeoutMs || 45000);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: this.activeAbortController?.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let parsedMsg = errorText;
          try {
            const errJson = JSON.parse(errorText);
            parsedMsg = errJson.error?.message || errJson.message || errorText;
          } catch {
            // Keep raw text
          }

          throw new Error(`API error (${response.status}): ${parsedMsg}`);
        }

        if (!response.body) {
          throw new Error('Response body is null, cannot stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        await new Promise<void>((resolve, reject) => {
          const parser = new StreamParser(
            (delta) => {
              if (delta.thought) {
                fullThoughts += delta.thought;
                callbacks.onThought?.(delta.thought);
              }
              if (delta.content) {
                fullContent += delta.content;
                callbacks.onChunk(delta.content);
              }
            },
            (err) => reject(err),
            () => resolve()
          );

          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  parser.feed('\ndata: [DONE]\n\n');
                  break;
                }
                const chunkStr = decoder.decode(value, { stream: true });
                parser.feed(chunkStr);
              }
            } catch (err: any) {
              if (err.name === 'AbortError') {
                resolve();
              } else {
                reject(err);
              }
            }
          };

          pump();
        });

        callbacks.onComplete(fullContent, fullThoughts.length > 0 ? fullThoughts : undefined);

        diagnosticLogger.addLog({
          type: 'chat_completion',
          providerId: currentProvider.id,
          providerName: currentProvider.name,
          endpoint,
          model: currentProvider.model,
          requestHeaders: { ...headers, Authorization: headers['Authorization'] ? 'Bearer ***' : '' },
          requestBody: body,
          status: 200,
          statusText: 'OK',
          responseRaw: `[Completed: ${fullContent.length} chars generated]`,
          latencyMs: 0,
          success: true,
          whyAnalysis: diagnosticLogger.analyzeWhy(200),
        });
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
          // User aborted generation manually
          callbacks.onComplete(fullContent, fullThoughts.length > 0 ? fullThoughts : undefined);
          return;
        }

        diagnosticLogger.addLog({
          type: 'chat_completion',
          providerId: currentProvider.id,
          providerName: currentProvider.name,
          endpoint,
          model: currentProvider.model,
          requestHeaders: { ...headers, Authorization: headers['Authorization'] ? 'Bearer ***' : '' },
          requestBody: body,
          status: err.message.match(/\((\d+)\)/) ? parseInt(err.message.match(/\((\d+)\)/)![1]) : 0,
          statusText: 'Error',
          responseRaw: err.message,
          parsedError: err.message,
          latencyMs: 0,
          success: false,
          whyAnalysis: diagnosticLogger.analyzeWhy(
            err.message.match(/\((\d+)\)/) ? parseInt(err.message.match(/\((\d+)\)/)![1]) : undefined,
            err.message,
            body
          ),
        });

        const shouldRetry =
          attemptNumber < (currentProvider.retryCount ?? 1) &&
          !err.message.includes('401') && // Don't retry invalid auth
          !err.message.includes('404');   // Don't retry nonexistent model

        if (shouldRetry) {
          const delayMs = Math.pow(2, attemptNumber) * 1000;
          console.warn(`Attempt ${attemptNumber} failed: ${err.message}. Retrying in ${delayMs}ms...`);
          await new Promise((r) => setTimeout(r, delayMs));
          return executeAttempt(currentProvider, attemptNumber + 1);
        }

        // If primary provider failed all retries, check for fallback provider
        if (fallbackProvider && fallbackProvider.id !== currentProvider.id) {
          console.warn(`Primary provider ${currentProvider.name} failed. Attempting fallback: ${fallbackProvider.name}`);
          return executeAttempt(fallbackProvider, 1);
        }

        callbacks.onError(err);
      }
    };

    return executeAttempt(provider, 1);
  }

  /**
   * Non-streaming call (e.g. for memory extraction or summarization).
   */
  public async sendChat(
    provider: AIProviderConfig,
    messages: PromptPayloadMessage[]
  ): Promise<{ content: string; thoughts?: string; latencyMs: number }> {
    const startTime = Date.now();
    const endpoint = this.normalizeChatEndpoint(provider.baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(provider.customHeaders || {}),
    };

    if (provider.apiKey && provider.apiKey.trim().length > 0) {
      headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`;
    }

    const body: any = {
      model: provider.model,
      messages,
      temperature: provider.temperature ?? 0.7,
      max_tokens: provider.maxTokens ?? 1024,
      stream: false,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const text = await response.text();
      let parsed = text;
      try {
        const json = JSON.parse(text);
        parsed = json.error?.message || json.message || text;
      } catch {}
      throw new Error(`API Error (${response.status}): ${parsed}`);
    }

    const json = await response.json();
    const choice = json.choices?.[0];
    let content = choice?.message?.content || '';
    let thoughts = choice?.message?.reasoning_content || undefined;

    // Check for inline <think> tags
    if (content.includes('<think>') && content.includes('</think>')) {
      const match = content.match(/<think>([\s\S]*?)<\/think>/);
      if (match) {
        thoughts = match[1].trim();
        content = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      }
    }

    return { content, thoughts, latencyMs };
  }

  public stopGeneration(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  public isGenerating(): boolean {
    return this.activeAbortController !== null;
  }

  private normalizeChatEndpoint(baseUrl: string): string {
    let clean = baseUrl.trim().replace(/\/+$/, '');
    if (clean.endsWith('/chat/completions')) {
      return clean;
    }
    return `${clean}/chat/completions`;
  }
}

export const providerEngine = new ProviderEngine();
