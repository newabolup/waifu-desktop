import { describe, it, expect } from 'vitest';
import { MemoryExtractor } from '../src/services/memory/memoryExtractor';
import { HybridMemoryRetrieval } from '../src/services/memory/hybridRetrieval';
import { MemoryItem, NegativeMemoryRule } from '../src/types/memory';

describe('MemoryEngine Modules', () => {
  const extractor = new MemoryExtractor();
  const retrieval = new HybridMemoryRetrieval();

  describe('MemoryExtractor', () => {
    it('extracts user preferences through heuristics', () => {
      const facts = extractor.extractHeuristicFacts(
        'I really like playing piano and drinking matcha latte.',
        'That sounds so peaceful! I love listening to you play.'
      );

      expect(facts.length).toBeGreaterThan(0);
      expect(facts[0].category).toBe('preference');
      expect(facts[0].content).toContain('User preference');
    });

    it('extracts biographical facts', () => {
      const facts = extractor.extractHeuristicFacts(
        'I work as a software engineer at a startup.',
        'Software engineering sounds challenging but fun!'
      );

      expect(facts.length).toBeGreaterThan(0);
      expect(facts[0].category).toBe('fact');
      expect(facts[0].content).toContain('software engineer');
    });

    it('extracts user corrections', () => {
      const facts = extractor.extractHeuristicFacts(
        'Actually, my favorite color is emerald green, not purple.',
        'Oh, got it! I will remember that.'
      );

      expect(facts.some((f) => f.category === 'correction')).toBe(true);
    });

    it('blocks blacklisted terms from being remembered', () => {
      const blacklist: NegativeMemoryRule[] = [
        { id: 'b1', pattern: 'password', createdAt: Date.now() },
        { id: 'b2', pattern: 'confidential', createdAt: Date.now() },
      ];

      expect(extractor.isBlacklisted('User password is secret123', blacklist)).toBe(true);
      expect(extractor.isBlacklisted('User confidential files', blacklist)).toBe(true);
      expect(extractor.isBlacklisted('User likes stargazing', blacklist)).toBe(false);
    });
  });

  describe('HybridMemoryRetrieval', () => {
    const mockMemories: MemoryItem[] = [
      {
        id: '1',
        characterId: 'char-1',
        category: 'preference',
        content: 'User loves cats and has an orange tabby named Mochi.',
        confidence: 0.9,
        importance: 8,
        isPermanent: false,
        isPinned: false,
        accessCount: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        characterId: 'char-1',
        category: 'fact',
        content: 'User lives in Tokyo and commutes by bicycle.',
        confidence: 0.95,
        importance: 7,
        isPermanent: false,
        isPinned: false,
        accessCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '3',
        characterId: 'char-1',
        category: 'preference',
        content: 'User dislikes loud places and crowded subway stations.',
        confidence: 0.8,
        importance: 6,
        isPermanent: false,
        isPinned: false,
        accessCount: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    it('prioritizes relevant keyword matching memories', () => {
      const query = 'How is your cat doing today? Did Mochi wake you up?';
      const ranked = retrieval.rankMemories(mockMemories, query);

      // Memory 1 (about cats and Mochi) should rank highest
      expect(ranked[0].memory.id).toBe('1');
    });

    it('prioritizes pinned memories even without strong keyword overlap', () => {
      const query = 'Let us talk about quantum physics.';
      const memoriesWithPinned = mockMemories.map((m) =>
        m.id === '3' ? { ...m, isPinned: true } : m
      );
      const ranked = retrieval.rankMemories(memoriesWithPinned, query);

      // Pinned memory receives +50 base score
      expect(ranked[0].memory.isPinned).toBe(true);
      expect(ranked[0].memory.id).toBe('3');
    });

    it('respects token budget limit', () => {
      const ranked = retrieval.rankMemories(mockMemories, 'cats and bicycles in tokyo');
      // Very small token budget: should only fit 1 memory
      const selected = retrieval.selectForTokenBudget(ranked, 35);
      expect(selected.length).toBeLessThanOrEqual(1);
    });
  });
});
