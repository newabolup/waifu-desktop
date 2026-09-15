export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  thoughts?: string; // Reasoning / <think> block
  tokensUsed?: number;
  latencyMs?: number;
  modelUsed?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSession {
  id: string;
  characterId: string;
  title: string;
  summary?: string;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}
