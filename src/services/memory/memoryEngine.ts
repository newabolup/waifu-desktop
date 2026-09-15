import { StorageService } from '../storage/db';
import { MemoryItem, MemoryFilter, NegativeMemoryRule } from '../../types/memory';
import { AIProviderConfig } from '../../types/provider';
import { hybridMemoryRetrieval } from './hybridRetrieval';
import { memoryExtractor } from './memoryExtractor';

export class MemoryEngine {
  private storage = StorageService.getInstance();

  /**
   * Retrieves top relevant memories tailored to the active user message.
   */
  public async retrieveRelevantMemories(
    characterId: string,
    currentQuery: string,
    recentContextText = '',
    tokenBudget = 800
  ): Promise<MemoryItem[]> {
    const allMemories = await this.storage.getMemories(characterId);
    if (!allMemories.length) return [];

    const ranked = hybridMemoryRetrieval.rankMemories(allMemories, currentQuery, recentContextText);
    const selected = hybridMemoryRetrieval.selectForTokenBudget(ranked, tokenBudget);

    // Update access statistics for retrieved memories
    if (selected.length > 0) {
      await this.storage.touchMemoriesAccess(selected.map((m) => m.id));
    }

    return selected;
  }

  /**
   * Automatically extracts durable memories from a finished conversation exchange.
   */
  public async extractAndStoreMemories(
    characterId: string,
    userMessage: string,
    assistantReply: string,
    provider?: AIProviderConfig,
    sourceMessageId?: string
  ): Promise<MemoryItem[]> {
    const blacklist = await this.storage.getBlacklistRules();

    let extractedFacts = [];
    if (provider && provider.baseUrl) {
      extractedFacts = await memoryExtractor.extractWithLLM(provider, userMessage, assistantReply, blacklist);
    } else {
      extractedFacts = memoryExtractor.extractHeuristicFacts(userMessage, assistantReply);
      extractedFacts = extractedFacts.filter((f) => !memoryExtractor.isBlacklisted(f.content, blacklist));
    }

    const existingMemories = await this.storage.getMemories(characterId);
    const savedItems: MemoryItem[] = [];

    for (const fact of extractedFacts) {
      // Check for near-duplicate or existing memory to update
      const existing = existingMemories.find((m) => {
        return (
          m.category === fact.category &&
          (m.content.toLowerCase().includes(fact.content.toLowerCase()) ||
            fact.content.toLowerCase().includes(m.content.toLowerCase()))
        );
      });

      if (existing) {
        existing.content = fact.content;
        existing.importance = Math.max(existing.importance, fact.importance);
        existing.confidence = Math.max(existing.confidence, fact.confidence);
        existing.updatedAt = Date.now();
        await this.storage.saveMemory(existing);
        savedItems.push(existing);
      } else {
        const newMem: MemoryItem = {
          id: 'mem-' + Math.random().toString(36).substring(2, 10),
          characterId,
          category: fact.category,
          content: fact.content,
          confidence: fact.confidence,
          importance: fact.importance,
          isPermanent: false,
          isPinned: false,
          sourceMessageId,
          accessCount: 1,
          lastAccessedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await this.storage.saveMemory(newMem);
        savedItems.push(newMem);
      }
    }

    return savedItems;
  }

  // Pass-through helpers for UI
  public async getAllMemories(characterId?: string, filter?: MemoryFilter): Promise<MemoryItem[]> {
    return this.storage.getMemories(characterId, filter);
  }

  public async saveMemory(mem: MemoryItem): Promise<void> {
    return this.storage.saveMemory(mem);
  }

  public async deleteMemory(id: string): Promise<void> {
    return this.storage.deleteMemory(id);
  }

  public async getBlacklist(): Promise<NegativeMemoryRule[]> {
    return this.storage.getBlacklistRules();
  }

  public async addBlacklistRule(pattern: string): Promise<void> {
    return this.storage.saveBlacklistRule({
      id: 'bl-' + Math.random().toString(36).substring(2, 9),
      pattern: pattern.trim(),
      createdAt: Date.now(),
    });
  }

  public async deleteBlacklistRule(id: string): Promise<void> {
    return this.storage.deleteBlacklistRule(id);
  }
}

export const memoryEngine = new MemoryEngine();
