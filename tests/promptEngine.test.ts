import { describe, it, expect } from 'vitest';
import { PromptEngine } from '../src/services/prompt/promptEngine';
import { DEFAULT_CHARACTER, DEFAULT_RELATIONSHIP, DEFAULT_EMOTIONS } from '../src/services/storage/defaults';
import { MemoryItem } from '../src/types/memory';

describe('PromptEngine', () => {
  const engine = new PromptEngine();

  it('compiles system prompt with all expected sections', () => {
    const memories: MemoryItem[] = [
      {
        id: 'm1',
        characterId: DEFAULT_CHARACTER.id,
        category: 'preference',
        content: 'User loves green tea with honey',
        confidence: 0.9,
        importance: 8,
        isPermanent: false,
        isPinned: true,
        accessCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = engine.compileSystemPrompt({
      character: DEFAULT_CHARACTER,
      emotionalState: DEFAULT_EMOTIONS,
      relationship: DEFAULT_RELATIONSHIP,
      memories,
      userProfile: {
        name: 'Senpai',
        pronouns: 'they/them',
        interests: ['Anime', 'Coding'],
      },
    });

    expect(result).toContain('CORE IDENTITY: KIZUNA');
    expect(result).toContain(DEFAULT_CHARACTER.personality);
    expect(result).toContain('SPEAKING STYLE & VOICE');
    expect(result).toContain('CURRENT RELATIONSHIP STAGE: CLOSE FRIEND');
    expect(result).toContain('CURRENT EMOTIONAL STATE & AFFECT');
    expect(result).toContain('User loves green tea with honey');
    expect(result).toContain('Senpai');
    expect(result).toContain('they/them');
  });

  it('estimates token counts accurately (~3.8 chars per token)', () => {
    const text = 'This is a test prompt for estimating tokens.';
    const est = engine.estimateTokens(text);
    expect(est).toBeGreaterThan(5);
    expect(est).toBeLessThan(20);
  });

  it('supports custom system prompt overrides', () => {
    const override = 'You are a completely custom persona without sections.';
    const result = engine.compileSystemPrompt({
      character: DEFAULT_CHARACTER,
      customSystemPromptOverride: override,
    });

    expect(result).toBe(override);
  });

  it('compiles payload with system prompt and recent message history', () => {
    const payload = engine.compilePayload({
      character: DEFAULT_CHARACTER,
      recentMessages: [
        {
          id: '1',
          conversationId: 'c1',
          role: 'user',
          content: 'Hello Kizuna!',
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: '2',
          conversationId: 'c1',
          role: 'assistant',
          content: 'Hello Senpai! *smiles*',
          createdAt: 2000,
          updatedAt: 2000,
        },
      ],
    });

    expect(payload.length).toBe(3); // system + user + assistant
    expect(payload[0].role).toBe('system');
    expect(payload[1].role).toBe('user');
    expect(payload[1].content).toBe('Hello Kizuna!');
    expect(payload[2].role).toBe('assistant');
  });
});
