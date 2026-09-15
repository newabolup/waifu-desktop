import { EmotionalState, DominantMood } from '../../types/emotion';
import { CharacterProfile, AvatarExpression } from '../../types/character';
import { StorageService } from '../storage/db';

export class EmotionEngine {
  private storage = StorageService.getInstance();

  /**
   * Natural decay towards character baselines over elapsed time.
   */
  public applyDecay(state: EmotionalState, character: CharacterProfile): EmotionalState {
    const now = Date.now();
    const hoursElapsed = Math.max(0, (now - state.lastUpdated) / (1000 * 60 * 60));
    if (hoursElapsed < 0.25) return state; // Only decay if at least 15 mins passed

    // Decay rate: moves ~15% closer to baseline per hour
    const decayFactor = Math.min(0.8, hoursElapsed * 0.15);

    const pullTowards = (current: number, baseline: number) => {
      return Math.round(current + (baseline - current) * decayFactor);
    };

    return {
      ...state,
      happiness: pullTowards(state.happiness, character.baselineHappiness ?? 80),
      affection: pullTowards(state.affection, character.baselineAffection ?? 80),
      excitement: pullTowards(state.excitement, character.baselineExcitement ?? 70),
      energy: pullTowards(state.energy, character.baselineEnergy ?? 75),
      trust: pullTowards(state.trust, character.baselineTrust ?? 80),
      sadness: pullTowards(state.sadness, 10),
      anger: pullTowards(state.anger, 5),
      jealousy: pullTowards(state.jealousy, 10),
      lastUpdated: now,
    };
  }

  /**
   * Analyzes conversation exchange and adjusts emotional axes.
   */
  public updateEmotionalReaction(
    currentState: EmotionalState,
    userMessage: string,
    assistantReply: string
  ): EmotionalState {
    if (!currentState.isEnabled) return currentState;

    const uLower = userMessage.toLowerCase();
    const aLower = assistantReply.toLowerCase();
    const updated = { ...currentState };

    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    // Affectionate triggers
    if (/(?:love you|cute|darling|sweetheart|missed you|proud of you|cherish|best waifu|best girl)/i.test(uLower)) {
      updated.affection = clamp(updated.affection + 6 * currentState.intensity);
      updated.happiness = clamp(updated.happiness + 5 * currentState.intensity);
      updated.excitement = clamp(updated.excitement + 4 * currentState.intensity);
      updated.sadness = clamp(updated.sadness - 5);
    }

    // Gratitude triggers
    if (/(?:thank you|thanks|grateful|appreciate you|you helped me)/i.test(uLower)) {
      updated.happiness = clamp(updated.happiness + 4 * currentState.intensity);
      updated.trust = clamp(updated.trust + 3 * currentState.intensity);
    }

    // Negative / Frustrated triggers
    if (/(?:shut up|annoying|hate you|go away|idiot|stupid|bad)/i.test(uLower)) {
      updated.sadness = clamp(updated.sadness + 12 * currentState.intensity);
      updated.anger = clamp(updated.anger + 8 * currentState.intensity);
      updated.happiness = clamp(updated.happiness - 15 * currentState.intensity);
      updated.affection = clamp(updated.affection - 5 * currentState.intensity);
    }

    // Mentioning other characters or rivals
    if (/(?:other girl|another girl|my ex|dating someone|met someone else)/i.test(uLower)) {
      updated.jealousy = clamp(updated.jealousy + 20 * currentState.intensity);
      updated.sadness = clamp(updated.sadness + 6 * currentState.intensity);
    }

    // Excitement triggers
    if (/(?:awesome|celebrate|won|exciting|yay|omg|let's go|party)/i.test(uLower)) {
      updated.excitement = clamp(updated.excitement + 8 * currentState.intensity);
      updated.energy = clamp(updated.energy + 5 * currentState.intensity);
      updated.happiness = clamp(updated.happiness + 6 * currentState.intensity);
    }

    // Tired / late night triggers
    if (/(?:tired|sleepy|goodnight|going to bed|exhausted|yawn)/i.test(uLower)) {
      updated.energy = clamp(updated.energy - 10);
      updated.affection = clamp(updated.affection + 4 * currentState.intensity);
    }

    updated.familiarity = clamp(updated.familiarity + 1);
    updated.lastUpdated = Date.now();

    return updated;
  }

  /**
   * Determines the dominant descriptive mood for UI badges and aura colors.
   */
  public getDominantMood(state: EmotionalState): DominantMood {
    if (state.energy <= 30) return 'Sleepy';
    if (state.anger >= 50) return 'Pouting';
    if (state.sadness >= 55) return 'Melancholy';
    if (state.jealousy >= 50) return 'Flustered';
    if (state.affection >= 85 && state.happiness >= 80) return 'Radiant';
    if (state.affection >= 75) return 'Affectionate';
    if (state.excitement >= 75) return 'Excited';
    if (state.trust >= 80 && state.sadness < 20) return 'Serene';
    return 'Pensive';
  }

  /**
   * Maps current emotional state into an avatar expression.
   */
  public getAvatarExpressionForState(state: EmotionalState, isTalking = false): AvatarExpression {
    if (isTalking) return 'talking';
    if (state.energy <= 25) return 'sleepy';
    if (state.anger >= 50) return 'angry';
    if (state.sadness >= 50) return 'sad';
    if (state.jealousy >= 50) return 'blushing';
    if (state.excitement >= 75) return 'surprised';
    if (state.happiness >= 75 || state.affection >= 80) return 'happy';
    return 'idle';
  }

  public async getAndDecayState(character: CharacterProfile): Promise<EmotionalState> {
    const raw = await this.storage.getEmotionalState(character.id);
    const decayed = this.applyDecay(raw, character);
    if (decayed.lastUpdated !== raw.lastUpdated) {
      await this.storage.saveEmotionalState(decayed);
    }
    return decayed;
  }
}

export const emotionEngine = new EmotionEngine();
