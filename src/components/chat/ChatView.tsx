import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ConversationSession } from '../../types/conversation';
import { CharacterProfile } from '../../types/character';
import { STTConfig } from '../../types/voice';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { ConversationListModal } from './ConversationListModal';
import {
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ChatViewProps {
  character: CharacterProfile;
  activeConversation: ConversationSession;
  allConversations: ConversationSession[];
  messages: ChatMessage[];
  streamingContent: string;
  streamingThoughts: string;
  isGenerating: boolean;
  activeAudioMessageId?: string;
  errorMessage?: string;
  onSendMessage: (content: string) => void;
  onStopGeneration: () => void;
  onContinueGeneration?: () => void;
  onRetryLast?: () => void;
  onRegenerateMessage: (msgId: string) => void;
  onEditMessage: (msgId: string, newContent: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onTogglePinConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onExportConversation: (id: string, format: 'json' | 'markdown') => void;
  onClearCurrentChat: () => void;
  onSpeakMessage: (msgId: string, text: string) => void;
  onStopAudio: () => void;
  sttConfig?: STTConfig;
}

export const ChatView: React.FC<ChatViewProps> = ({
  character,
  activeConversation,
  allConversations,
  messages,
  streamingContent,
  streamingThoughts,
  isGenerating,
  activeAudioMessageId,
  errorMessage,
  onSendMessage,
  onStopGeneration,
  onContinueGeneration,
  onRetryLast,
  onRegenerateMessage,
  onEditMessage,
  onDeleteMessage,
  onSelectConversation,
  onCreateConversation,
  onRenameConversation,
  onTogglePinConversation,
  onDeleteConversation,
  onExportConversation,
  onClearCurrentChat,
  onSpeakMessage,
  onStopAudio,
  sttConfig,
}) => {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [inChatSearch, setInChatSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message or streaming delta
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const filteredMessages = inChatSearch
    ? messages.filter((m) => m.content.toLowerCase().includes(inChatSearch.toLowerCase()))
    : messages;

  return (
    <div className="relative flex flex-col h-full w-full bg-[#0d0f1a]/80 select-none">
      {/* Top Chat Header */}
      <div className="h-14 px-4 border-b border-slate-800/80 flex items-center justify-between bg-[#111424]/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sakura-500/40 text-slate-200 text-xs font-medium transition"
            title="View all conversations"
          >
            <MessageSquare className="w-3.5 h-3.5 text-sakura-400" />
            <span className="truncate max-w-[160px] font-semibold">{activeConversation.title}</span>
            <span className="text-[10px] text-slate-500">({allConversations.length})</span>
          </button>

          <button
            onClick={onCreateConversation}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          {isSearchOpen ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700">
              <input
                type="text"
                value={inChatSearch}
                onChange={(e) => setInChatSearch(e.target.value)}
                placeholder="Find in chat..."
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-32"
                autoFocus
              />
              <button
                onClick={() => {
                  setInChatSearch('');
                  setIsSearchOpen(false);
                }}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Search in conversation"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onExportConversation(activeConversation.id, 'markdown')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Export conversation as Markdown"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (confirm('Clear all messages in this conversation?')) {
                onClearCurrentChat();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error notification banner if any */}
      {errorMessage && (
        <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {filteredMessages.length === 0 && !streamingContent ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <div className="w-16 h-16 rounded-full bg-sakura-950/40 border border-sakura-500/20 flex items-center justify-center mb-4 text-sakura-400 shadow-lg shadow-sakura-950/40">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-1">
              Start chatting with {character.name}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Your conversations, memories, and emotional bond are saved locally on your PC.
            </p>
          </div>
        ) : (
          <>
            {filteredMessages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                character={character}
                isAudioPlaying={activeAudioMessageId === msg.id}
                onRegenerate={
                  msg.role === 'assistant' ? () => onRegenerateMessage(msg.id) : undefined
                }
                onEdit={(newText) => onEditMessage(msg.id, newText)}
                onDelete={() => onDeleteMessage(msg.id)}
                onSpeak={(text) => onSpeakMessage(msg.id, text)}
                onStopAudio={onStopAudio}
              />
            ))}

            {/* Live Streaming Response Placeholder */}
            {isGenerating && (streamingContent || streamingThoughts) && (
              <ChatMessageItem
                message={{
                  id: 'streaming-active',
                  conversationId: activeConversation.id,
                  role: 'assistant',
                  content: streamingContent || '...',
                  thoughts: streamingThoughts || undefined,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                }}
                character={character}
                isStreaming={true}
              />
            )}
            <div ref={scrollBottomRef} />
          </>
        )}
      </div>

      {/* Chat Input Bar */}
      <ChatInput
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
        onContinueGeneration={onContinueGeneration}
        onRetryLast={onRetryLast}
        isGenerating={isGenerating}
        characterName={character.name}
        sttConfig={sttConfig}
      />

      {/* Conversation Sessions Modal */}
      <ConversationListModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        conversations={allConversations}
        activeConversationId={activeConversation.id}
        onSelectConversation={onSelectConversation}
        onCreateConversation={onCreateConversation}
        onRenameConversation={onRenameConversation}
        onTogglePinConversation={onTogglePinConversation}
        onDeleteConversation={onDeleteConversation}
        onExportConversation={onExportConversation}
      />
    </div>
  );
};
