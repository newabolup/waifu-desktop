import { describe, it, expect } from 'vitest';
import { EmotionEngine } from '../src/services/emotion/emotionEngine';
import { RelationshipEngine } from '../src/services/relationship/relationshipEngine';
import { DEFAULT_CHARACTER, DEFAULT_EMOTIONS, DEFAULT_RELATIONSHIP } from '../src/services/storage/defaults';

describe('Emotion & Relationship Engines', () => {
  const emotion = new EmotionEngine();
  const relEngine = new RelationshipEngine();

  describe('EmotionEngine', () => {
    it('decays elevated emotions back towards baseline over elapsed time', () => {
      const spiked = {
        ...DEFAULT_EMOTIONS,
        anger: 80, // Spiked anger
        sadness: 70, // Spiked sadness
        lastUpdated: Date.now() - 1000 * 60 * 60 * 4, // 4 hours ago
      };

      const decayed = emotion.applyDecay(spiked, DEFAULT_CHARACTER);

      // Anger and sadness should have pulled down towards baseline 5 and 10
      expect(decayed.anger).toBeLessThan(80);
      expect(decayed.sadness).toBeLessThan(70);
    });

    it('increases affection and happiness upon sweet remarks', () => {
      const start = { ...DEFAULT_EMOTIONS, affection: 60, happiness: 60 };
      const updated = emotion.updateEmotionalReaction(
        start,
        'I love you so much, you are the best girl ever!',
        'Aww, you make my heart flutter! *blushes*'
      );

      expect(updated.affection).toBeGreaterThan(60);
      expect(updated.happiness).toBeGreaterThan(60);
    });

    it('increases jealousy and sadness upon mentioning rivals', () => {
      const start = { ...DEFAULT_EMOTIONS, jealousy: 10, sadness: 10 };
      const updated = emotion.updateEmotionalReaction(
        start,
        'I went out with another girl today.',
        'Oh... I see...'
      );

      expect(updated.jealousy).toBeGreaterThan(10);
      expect(updated.sadness).toBeGreaterThan(10);
    });

    it('classifies dominant mood correctly', () => {
      expect(
        emotion.getDominantMood({ ...DEFAULT_EMOTIONS, energy: 20 })
      ).toBe('Sleepy');

      expect(
        emotion.getDominantMood({ ...DEFAULT_EMOTIONS, anger: 70 })
      ).toBe('Pouting');

      expect(
        emotion.getDominantMood({ ...DEFAULT_EMOTIONS, affection: 90, happiness: 90 })
      ).toBe('Radiant');
    });
  });

  describe('RelationshipEngine', () => {
    it('calculates thoughtful message bonus affinity points', () => {
      const standardPts = relEngine.calculateAffinityGain('Hi', 'Hello');
      const deepPts = relEngine.calculateAffinityGain(
        'Thank you so much for being here with me. You are truly special to me and I cherish every conversation.',
        'I cherish you too.'
      );

      expect(deepPts).toBeGreaterThan(standardPts);
    });

    it('identifies current and next stages', () => {
      const curr = relEngine.getCurrentStage(DEFAULT_RELATIONSHIP);
      expect(curr.name).toBe('Close Friend');

      const next = relEngine.getNextStage(DEFAULT_RELATIONSHIP);
      expect(next?.name).toBe('Romantic Partner');
    });
  });
});
