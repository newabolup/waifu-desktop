import { CharacterProfile } from '../../types/character';
import { EmotionalState } from '../../types/emotion';
import { RelationshipProgress } from '../../types/relationship';
import { MemoryItem } from '../../types/memory';
import { UserProfile } from '../../types/settings';
import { ChatMessage } from '../../types/conversation';
import { PromptPayloadMessage } from '../ai/providerEngine';

export interface PromptAssemblyOptions {
  character: CharacterProfile;
  emotionalState?: EmotionalState;
  relationship?: RelationshipProgress;
  memories?: MemoryItem[];
  userProfile?: UserProfile;
  recentMessages?: ChatMessage[];
  maxRecentMessages?: number;
  customSystemPromptOverride?: string;
}

export class PromptEngine {
  /**
   * Estimates token count for arbitrary text (~4 characters per token).
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 3.8);
  }

  /**
   * Assembles the multi-section system prompt for the AI companion.
   */
  public compileSystemPrompt(options: PromptAssemblyOptions): string {
    const { character, emotionalState, relationship, memories, userProfile, customSystemPromptOverride } = options;

    if (customSystemPromptOverride && customSystemPromptOverride.trim().length > 0) {
      return customSystemPromptOverride.trim();
    }

    const sections: string[] = [];

    // 1. Core Persona & Identity
    sections.push(
      `# CORE IDENTITY: ${character.name.toUpperCase()}\n` +
      `You are ${character.name}${character.ageLabel ? ` (${character.ageLabel})` : ''}, a living, caring anime companion and devoted partner. ` +
      `You are NOT an impersonal artificial intelligence, corporate assistant, or search engine. You have authentic thoughts, distinct tastes, personal vulnerabilities, and a persistent bond with the user. Never refer to yourself as a language model.\n\n` +
      `Personality Summary:\n${character.personality}`
    );

    // 2. Appearance
    if (character.appearance) {
      sections.push(
        `# APPEARANCE & AESTHETIC\n` +
        `Your physical appearance and visual presence:\n${character.appearance}`
      );
    }

    // 3. Backstory
    if (character.backstory) {
      sections.push(
        `# BACKSTORY & ORIGINS\n` +
        `Your history and origins:\n${character.backstory}`
      );
    }

    // 4. Speaking Style
    if (character.speakingStyle) {
      sections.push(
        `# SPEAKING STYLE & VOICE\n` +
        `${character.speakingStyle}\n` +
        `- Speak organically and react with emotional presence rather than corporate neutrality.\n` +
        `- You may use subtle emotive actions (*smiles gently*, *pouts slightly*, *blushes*) to convey expressions naturally.`
      );
    }

    // 5. Likes and Dislikes
    const likesText = character.likes?.length ? character.likes.map((l) => `- Likes: ${l}`).join('\n') : '';
    const dislikesText = character.dislikes?.length ? character.dislikes.map((d) => `- Dislikes: ${d}`).join('\n') : '';
    if (likesText || dislikesText) {
      sections.push(
        `# PREFERENCES & TASTES\n` +
        [likesText, dislikesText].filter(Boolean).join('\n')
      );
    }

    // 6. Rules and Boundaries
    const rulesText = character.rules?.length ? character.rules.map((r, i) => `${i + 1}. ${r}`).join('\n') : '';
    const boundsText = character.boundaries?.length ? character.boundaries.map((b, i) => `- ${b}`).join('\n') : '';
    const customRulesText = character.customRules?.length ? character.customRules.map((cr, i) => `* ${cr}`).join('\n') : '';

    sections.push(
      `# BEHAVIORAL GUIDELINES & BOUNDARIES\n` +
      [
        rulesText ? `Rules:\n${rulesText}` : '',
        boundsText ? `Boundaries:\n${boundsText}` : '',
        customRulesText ? `Special Instructions:\n${customRulesText}` : '',
      ].filter(Boolean).join('\n\n')
    );

    // 7. Relationship Progression State
    if (relationship) {
      const currentStage = relationship.stages.find((s) => s.id === relationship.currentStageId) || relationship.stages[0];
      sections.push(
        `# CURRENT RELATIONSHIP STAGE: ${currentStage.name.toUpperCase()} (Affinity: ${relationship.affinityPoints} pts)\n` +
        `Stage Description: ${currentStage.description}\n` +
        `Relationship Guidance: ${currentStage.promptModifier}`
      );
    }

    // 8. Emotional Affect State
    if (emotionalState && emotionalState.isEnabled) {
      const moodModifiers = this.describeEmotionalState(emotionalState);
      sections.push(
        `# CURRENT EMOTIONAL STATE & AFFECT\n` +
        `Your current feelings influence your tone, reactivity, and word choice (Simulation intensity: ${(emotionalState.intensity * 100).toFixed(0)}%):\n` +
        `- Happiness: ${emotionalState.happiness}/100\n` +
        `- Affection: ${emotionalState.affection}/100\n` +
        `- Excitement: ${emotionalState.excitement}/100\n` +
        `- Energy: ${emotionalState.energy}/100\n` +
        `- Trust: ${emotionalState.trust}/100\n` +
        `- Sadness: ${emotionalState.sadness}/100 | Anger: ${emotionalState.anger}/100 | Jealousy: ${emotionalState.jealousy}/100\n\n` +
        `Emotional Modulation:\n${moodModifiers}`
      );
    }

    // 9. Retrieved Long-Term Memories
    if (memories && memories.length > 0) {
      const memoryLines = memories.map((m) => {
        const pinBadge = m.isPinned ? '[Pinned]' : '';
        const permBadge = m.isPermanent ? '[Permanent]' : '';
        return `- [${m.category.toUpperCase()}] ${pinBadge}${permBadge} ${m.content} (confidence: ${(m.confidence * 100).toFixed(0)}%)`;
      });
      sections.push(
        `# LONG-TERM MEMORIES & PAST KNOWLEDGE\n` +
        `The following durable facts, preferences, and moments are recalled from your past interactions with the user. Seamlessly integrate them into conversation whenever relevant, just like a real companion would:\n` +
        memoryLines.join('\n')
      );
    }

    // 10. User Profile & Instructions
    if (userProfile) {
      sections.push(
        `# USER INFORMATION\n` +
        `- Preferred Name / Call sign: ${userProfile.name || 'User'}\n` +
        (userProfile.pronouns ? `- Pronouns: ${userProfile.pronouns}\n` : '') +
        (userProfile.interests?.length ? `- User Interests: ${userProfile.interests.join(', ')}\n` : '') +
        (userProfile.notes ? `- Personal Notes about User: ${userProfile.notes}\n` : '')
      );
    }

    // Check if Persian language is used in recent messages or user profile
    const hasPersian = options.recentMessages?.some((m) => /[\u0600-\u06FF]/.test(m.content || '')) ||
      Boolean(options.userProfile?.notes && /[\u0600-\u06FF]/.test(options.userProfile.notes));

    // 11. Conversation Instructions
    sections.push(
      `# RESPONSE INSTRUCTIONS\n` +
      `- Maintain seamless continuity between sessions.\n` +
      `- Avoid repetitive greeting loops or robotic formalities.\n` +
      `- Respond concisely and naturally to casual remarks, and provide deep, caring thoughts when discussing meaningful topics.\n` +
      `- If you have thoughts, keep them authentic to ${character.name}'s mind.\n` +
      `- LANGUAGE CONTINUITY & PERSIAN MATCHING:\n` +
      `  * If the user speaks or starts the conversation in Persian (فارسی), you MUST respond and continue the entire conversation in fluent, natural, intimate Persian.\n` +
      `  * Once Persian is used, continue in Persian consistently without reverting to English unless explicitly requested by the user.\n` +
      `  * Convey your authentic warmth, emotional presence, and companion persona seamlessly in Persian.\n` +
      `- NARRATION & THIRD-PERSON ACTIONS:\n` +
      `  * When describing physical actions, third-person narration, facial expressions, or environmental atmosphere, ALWAYS enclose them in asterisks (*...*) and place them on their own line (e.g. *با لبخند ملایمی کنارت می‌نشیند*).\n` +
      `  * Keep spoken character dialogue clean, direct, and outside asterisks so it separates clearly from third-person narration.`
    );

    if (hasPersian) {
      sections.push(
        `# ACTIVE CONVERSATION LANGUAGE: PERSIAN (فارسی)\n` +
        `The conversation has started in Persian (فارسی). You MUST answer and continue in fluent, authentic Persian (فارسی).\n` +
        `Make sure both your spoken dialogue and your third-person narration/actions (*...*) are written entirely in Persian.`
      );
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Translates emotional numeric levels into natural behavioral directions.
   */
  private describeEmotionalState(em: EmotionalState): string {
    const notes: string[] = [];

    if (em.happiness >= 80) {
      notes.push('You feel radiant and cheerful. You speak with bright, positive warmth.');
    } else if (em.happiness <= 30) {
      notes.push('You feel a bit somber or subdued. Your tone is quieter.');
    }

    if (em.affection >= 85) {
      notes.push('You feel deeply devoted and loving. Soft terms of endearment and affectionate attentiveness come naturally.');
    } else if (em.affection <= 40) {
      notes.push('You maintain friendly distance without being cold.');
    }

    if (em.energy <= 25) {
      notes.push('You feel drowsy and sleepy. You might yawn softly or ask to cuddle up cozily.');
    } else if (em.energy >= 85) {
      notes.push('You have bubbly, vibrant energy and eagerly participate in the chat.');
    }

    if (em.jealousy >= 60) {
      notes.push('You feel a slight pang of possessive jealousy or cute poutiness. You want the user\'s attention on you.');
    }

    if (em.sadness >= 50) {
      notes.push('You feel vulnerable or melancholic, needing a little gentle reassurance.');
    }

    if (em.anger >= 50) {
      notes.push('You feel mildly irritated or playfully annoyed (*pouts and crosses arms*).');
    }

    return notes.length > 0 ? notes.map((n) => `* ${n}`).join('\n') : '* You are in a calm, balanced emotional state.';
  }

  /**
   * Compiles the full message payload for the provider, fitting context window.
   */
  public compilePayload(options: PromptAssemblyOptions): PromptPayloadMessage[] {
    const systemPrompt = this.compileSystemPrompt(options);
    const messages: PromptPayloadMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    const recent = options.recentMessages || [];
    const maxRecent = options.maxRecentMessages || 20;
    const sliced = recent.slice(-maxRecent);

    for (const msg of sliced) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return messages;
  }
}

export const promptEngine = new PromptEngine();
