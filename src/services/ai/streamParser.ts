import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';

export interface ParsedStreamDelta {
  content?: string;
  thought?: string;
  finishReason?: string;
}

export class StreamParser {
  private parser: any;
  private insideThinkTag = false;
  private buffer = '';

  constructor(
    private onDelta: (delta: ParsedStreamDelta) => void,
    private onError: (err: Error) => void,
    private onFinish: () => void
  ) {
    this.parser = createParser({
      onEvent: (event: any) => {
        if (event && typeof event.data === 'string') {
          this.handleEvent(event.data);
        }
      },
    });
  }

  public feed(chunk: string): void {
    try {
      this.parser.feed(chunk);
    } catch (err: any) {
      this.onError(err);
    }
  }

  private handleEvent(data: string): void {
    const trimmed = data.trim();
    if (trimmed === '[DONE]') {
      this.flushRemainingBuffer();
      this.onFinish();
      return;
    }

    try {
      const json = JSON.parse(trimmed);
      const choice = json.choices?.[0];
      if (!choice) return;

      const delta = choice.delta;
      if (!delta) return;

      // DeepSeek / OpenRouter explicit reasoning_content
      if (delta.reasoning_content) {
        this.onDelta({ thought: delta.reasoning_content });
      }

      if (delta.content) {
        this.processTextChunk(delta.content);
      }

      if (choice.finish_reason) {
        this.flushRemainingBuffer();
        this.onDelta({ finishReason: choice.finish_reason });
      }
    } catch (err) {
      // Non-JSON line or partial
    }
  }

  private processTextChunk(text: string): void {
    this.buffer += text;

    while (this.buffer.length > 0) {
      if (!this.insideThinkTag) {
        const thinkStartIdx = this.buffer.indexOf('<think>');
        if (thinkStartIdx !== -1) {
          // Send content before <think>
          if (thinkStartIdx > 0) {
            this.onDelta({ content: this.buffer.substring(0, thinkStartIdx) });
          }
          this.insideThinkTag = true;
          this.buffer = this.buffer.substring(thinkStartIdx + 7);
        } else {
          // Check if buffer ends with a prefix of '<think>'
          let prefixMatch = false;
          for (let len = 1; len < 7; len++) {
            if (this.buffer.endsWith('<think>'.substring(0, len))) {
              prefixMatch = true;
              break;
            }
          }
          if (prefixMatch) {
            // Keep potential tag in buffer
            break;
          }
          this.onDelta({ content: this.buffer });
          this.buffer = '';
        }
      } else {
        const thinkEndIdx = this.buffer.indexOf('</think>');
        if (thinkEndIdx !== -1) {
          if (thinkEndIdx > 0) {
            this.onDelta({ thought: this.buffer.substring(0, thinkEndIdx) });
          }
          this.insideThinkTag = false;
          this.buffer = this.buffer.substring(thinkEndIdx + 8);
        } else {
          let prefixMatch = false;
          for (let len = 1; len < 8; len++) {
            if (this.buffer.endsWith('</think>'.substring(0, len))) {
              prefixMatch = true;
              break;
            }
          }
          if (prefixMatch) {
            break;
          }
          this.onDelta({ thought: this.buffer });
          this.buffer = '';
        }
      }
    }
  }

  private flushRemainingBuffer(): void {
    if (this.buffer.length > 0) {
      if (this.insideThinkTag) {
        this.onDelta({ thought: this.buffer });
      } else {
        this.onDelta({ content: this.buffer });
      }
      this.buffer = '';
    }
  }
}
