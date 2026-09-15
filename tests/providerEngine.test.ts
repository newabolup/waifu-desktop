import { describe, it, expect } from 'vitest';
import { StreamParser } from '../src/services/ai/streamParser';

describe('StreamParser & AI Provider Layer', () => {
  it('parses standard SSE chunks and handles [DONE]', () => {
    let assembledContent = '';
    let isFinished = false;

    const parser = new StreamParser(
      (delta) => {
        if (delta.content) assembledContent += delta.content;
      },
      (err) => {
        throw err;
      },
      () => {
        isFinished = true;
      }
    );

    parser.feed('data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n');
    parser.feed('data: {"choices":[{"delta":{"content":"Senpai!"}}]}\n\n');
    parser.feed('data: [DONE]\n\n');

    expect(assembledContent).toBe('Hello Senpai!');
    expect(isFinished).toBe(true);
  });

  it('separates inline <think> tags into thoughts delta', () => {
    let normalContent = '';
    let thoughtContent = '';

    const parser = new StreamParser(
      (delta) => {
        if (delta.content) normalContent += delta.content;
        if (delta.thought) thoughtContent += delta.thought;
      },
      () => {},
      () => {}
    );

    parser.feed('data: {"choices":[{"delta":{"content":"<think>I must speak warmly.</think>Good "}}]}\n\n');
    parser.feed('data: {"choices":[{"delta":{"content":"morning!"}}]}\n\n');
    parser.feed('data: [DONE]\n\n');

    expect(thoughtContent).toBe('I must speak warmly.');
    expect(normalContent).toBe('Good morning!');
  });

  it('handles explicit reasoning_content fields from deepseek/openrouter', () => {
    let normalContent = '';
    let thoughtContent = '';

    const parser = new StreamParser(
      (delta) => {
        if (delta.content) normalContent += delta.content;
        if (delta.thought) thoughtContent += delta.thought;
      },
      () => {},
      () => {}
    );

    parser.feed('data: {"choices":[{"delta":{"reasoning_content":"Step 1: Check mood."}}]}\n\n');
    parser.feed('data: {"choices":[{"delta":{"content":"I am happy to see you!"}}]}\n\n');
    parser.feed('data: [DONE]\n\n');

    expect(thoughtContent).toBe('Step 1: Check mood.');
    expect(normalContent).toBe('I am happy to see you!');
  });
});
