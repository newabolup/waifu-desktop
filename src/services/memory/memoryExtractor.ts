import { MemoryItem, MemoryCategory, NegativeMemoryRule } from '../../types/memory';
import { AIProviderConfig } from '../../types/provider';
import { providerEngine } from '../ai/providerEngine';

export interface ExtractedFact {
  category: MemoryCategory;
  content: string;
  importance: number;
  confidence: number;
}

export class MemoryExtractor {
  /**
   * Checks if candidate content violates negative memory rules.
   */
  public isBlacklisted(content: string, blacklist: NegativeMemoryRule[]): boolean {
    const lower = content.toLowerCase();
    for (const rule of blacklist) {
      if (!rule.pattern) continue;
      const pat = rule.pattern.toLowerCase().trim();
      if (pat.length > 0 && lower.includes(pat)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Fast rule-based heuristic extractor for offline or fallback operation.
   */
  public extractHeuristicFacts(userMessage: string, assistantReply: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    const text = userMessage.trim();

    // Preference patterns
    const prefRegexes = [
      /(?:i really like|i love|my favorite (?:thing|food|drink|game|movie|song|color|hobby) is) ([^.,!?]+)/i,
      /(?:i prefer|i enjoy|i am a fan of) ([^.,!?]+)/i,
      /(?:i hate|i dislike|i cannot stand|i don't like) ([^.,!?]+)/i,
    ];

    for (const rx of prefRegexes) {
      const match = text.match(rx);
      if (match) {
        facts.push({
          category: 'preference',
          content: `User preference: ${text}`,
          importance: 7,
          confidence: 0.85,
        });
        break;
      }
    }

    // Biographical facts
    const bioRegexes = [
      /(?:my name is|call me|i am called) ([^.,!?]+)/i,
      /(?:i work as|i am a|my job is) ([^.,!?]+)/i,
      /(?:i have a pet|my cat|my dog|my pet) ([^.,!?]+)/i,
      /(?:i live in|i am from|my hometown is) ([^.,!?]+)/i,
    ];

    for (const rx of bioRegexes) {
      const match = text.match(rx);
      if (match) {
        facts.push({
          category: 'fact',
          content: `User fact: ${text}`,
          importance: 8,
          confidence: 0.9,
        });
        break;
      }
    }

    // Corrections
    if (/(?:actually|no,|not true|i meant|correction|you remembered wrong)/i.test(text)) {
      facts.push({
        category: 'correction',
        content: `User clarified: ${text}`,
        importance: 9,
        confidence: 0.95,
      });
    }

    // Habits & Routines
    if (/(?:i always|i usually|every morning|every night|i tend to|i wake up at|i sleep at)/i.test(text)) {
      facts.push({
        category: 'habit',
        content: `User habit: ${text}`,
        importance: 6,
        confidence: 0.8,
      });
    }

    return facts;
  }

  /**
   * LLM-driven memory extractor: calls the provider in the background to distill durable facts.
   */
  public async extractWithLLM(
    provider: AIProviderConfig,
    userMessage: string,
    assistantReply: string,
    blacklist: NegativeMemoryRule[]
  ): Promise<ExtractedFact[]> {
    const prompt = `You are a memory distillation module for a companion AI.
Analyze the following short conversation exchange between User and Assistant:

User: "${userMessage}"
Assistant: "${assistantReply}"

Task:
Identify if the User revealed any durable, meaningful long-term personal facts, preferences, habits, corrections, or life events.
Do NOT remember fleeting remarks, greetings (e.g. "hello", "goodbye"), simple reactions, or transient conversation banter.
Do NOT remember sensitive security data, passwords, or temporary instructions.

If no durable information is present, output: []

Otherwise, respond ONLY with a valid JSON array of objects with this schema:
[
  {
    "category": "fact" | "preference" | "habit" | "emotional" | "relationship" | "correction",
    "content": "Concise factual statement about the user in 3rd person (e.g., 'User loves green tea with honey')",
    "importance": 1-10,
    "confidence": 0.5-1.0
  }
]`;

    try {
      const result = await providerEngine.sendChat(provider, [
        { role: 'system', content: 'You are an accurate factual memory extractor. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ]);

      const raw = result.content.trim();
      const jsonStart = raw.indexOf('[');
      const jsonEnd = raw.lastIndexOf(']');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = raw.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => {
            return (
              item &&
              typeof item.content === 'string' &&
              item.content.length > 5 &&
              !this.isBlacklisted(item.content, blacklist)
            );
          });
        }
      }
    } catch (err) {
      console.warn('LLM memory extraction failed, using heuristic fallback:', err);
    }

    // Heuristic fallback
    const heuristic = this.extractHeuristicFacts(userMessage, assistantReply);
    return heuristic.filter((f) => !this.isBlacklisted(f.content, blacklist));
  }
}

export const memoryExtractor = new MemoryExtractor();
