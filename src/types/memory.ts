export type MemoryCategory =
  | 'fact'
  | 'preference'
  | 'relationship'
  | 'event'
  | 'habit'
  | 'emotional'
  | 'correction';

export interface MemoryItem {
  id: string;
  characterId: string;
  category: MemoryCategory;
  content: string;
  confidence: number; // 0.0 to 1.0
  importance: number; // 1 to 10
  isPermanent: boolean;
  isPinned: boolean;
  sourceMessageId?: string;
  accessCount: number;
  lastAccessedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryFilter {
  query?: string;
  category?: MemoryCategory | 'all';
  isPinned?: boolean;
  isPermanent?: boolean;
}

export interface NegativeMemoryRule {
  id: string;
  pattern: string; // Forbidden keyword, regex, or topic
  createdAt: number;
}
