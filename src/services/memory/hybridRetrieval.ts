import { MemoryItem } from '../../types/memory';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
  'yours', 'yourself', 'yourselves'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export interface ScoredMemory {
  memory: MemoryItem;
  score: number;
}

export class HybridMemoryRetrieval {
  /**
   * Scores and ranks memories given the current user query and conversation context.
   */
  public rankMemories(
    memories: MemoryItem[],
    currentQuery: string,
    recentContextText = ''
  ): ScoredMemory[] {
    if (!memories.length) return [];

    const queryTokens = new Set(tokenize(currentQuery));
    const contextTokens = new Set(tokenize(recentContextText));

    const scored: ScoredMemory[] = memories.map((mem) => {
      let score = 0;
      const memTokens = tokenize(mem.content);

      // 1. Pinned & Permanent base scores
      if (mem.isPinned) score += 50.0;
      if (mem.isPermanent) score += 20.0;

      // 2. Exact keyword and stem matches in query
      let queryHits = 0;
      for (const token of memTokens) {
        if (queryTokens.has(token)) {
          queryHits++;
        }
      }

      // Query token overlap boost
      if (queryTokens.size > 0) {
        const queryOverlapRatio = queryHits / queryTokens.size;
        score += queryOverlapRatio * 40.0;
        score += queryHits * 5.0;
      }

      // 3. Context token overlap boost
      let contextHits = 0;
      for (const token of memTokens) {
        if (contextTokens.has(token)) {
          contextHits++;
        }
      }
      score += contextHits * 2.0;

      // 4. Importance (1 to 10 scale)
      score += (mem.importance || 5) * 2.0;

      // 5. Confidence weight
      score *= mem.confidence || 1.0;

      // 6. Category bias
      if (mem.category === 'correction') score += 15.0;
      if (mem.category === 'preference') score += 10.0;
      if (mem.category === 'habit') score += 5.0;

      // 7. Subtle recency & access factor
      if (mem.lastAccessedAt) {
        const hoursAgo = (Date.now() - mem.lastAccessedAt) / (1000 * 60 * 60);
        if (hoursAgo < 24) score += 5.0;
      }

      return { memory: mem, score };
    });

    // Sort descending by score
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Filters and selects memories that fit within the token budget.
   */
  public selectForTokenBudget(
    ranked: ScoredMemory[],
    tokenBudget = 800
  ): MemoryItem[] {
    const selected: MemoryItem[] = [];
    let currentTokens = 0;

    for (const item of ranked) {
      // Memory must meet minimum threshold if not pinned
      if (!item.memory.isPinned && item.score < 8.0) {
        continue;
      }

      const estimatedTokens = Math.ceil(item.memory.content.length / 3.8) + 15;
      if (currentTokens + estimatedTokens <= tokenBudget) {
        selected.push(item.memory);
        currentTokens += estimatedTokens;
      }
    }

    return selected;
  }
}

export const hybridMemoryRetrieval = new HybridMemoryRetrieval();
