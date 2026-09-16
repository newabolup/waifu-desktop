import React, { useState } from 'react';
import { ChatMessage } from '../../types/conversation';
import { CharacterProfile } from '../../types/character';
import { ThinkingDrawer } from './ThinkingDrawer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Copy,
  Check,
  RefreshCw,
  Edit2,
  Trash2,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  character: CharacterProfile;
  isStreaming?: boolean;
  isAudioPlaying?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onSpeak?: (text: string) => void;
  onStopAudio?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  character,
  isStreaming = false,
  isAudioPlaying = false,
  onRegenerate,
  onEdit,
  onDelete,
  onSpeak,
  onStopAudio,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(editContent.trim());
    }
    setIsEditing(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`group relative flex flex-col my-3 px-4 transition-all duration-200 ${
        isAssistant ? 'items-start' : 'items-end'
      }`}
    >
      {/* Sender name & timestamp */}
      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400 select-none">
        {isAssistant ? (
          <>
            <span className="font-semibold text-sakura-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sakura-400" />
              {character.name}
            </span>
            <span className="text-slate-500">•</span>
            <span>{formatTime(message.createdAt)}</span>
            {message.latencyMs && (
              <span className="text-[10px] text-slate-500 font-mono">({message.latencyMs}ms)</span>
            )}
            {message.modelUsed && (
              <span className="text-[10px] text-slate-500 font-mono">[{message.modelUsed}]</span>
            )}
          </>
        ) : (
          <>
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{formatTime(message.createdAt)}</span>
            <span className="text-slate-500">•</span>
            <span className="font-semibold text-slate-300">You</span>
          </>
        )}
      </div>

      {/* Bubble Container */}
      <div
        className={`relative max-w-[85%] md:max-w-[78%] rounded-2xl p-4 shadow-lg select-text ${
          isAssistant
            ? 'bg-[#151828]/90 border border-sakura-500/20 text-slate-100 rounded-tl-sm font-vazir'
            : 'bg-gradient-to-br from-sakura-600 to-rose-600 text-white rounded-tr-sm shadow-sakura-900/30 font-vazir'
        }`}
      >
        {/* Thinking Drawer for reasoning tokens */}
        {isAssistant && message.thoughts && (
          <ThinkingDrawer thoughts={message.thoughts} />
        )}

        {/* Edit mode or Content view */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              dir="auto"
              className="w-full min-h-[80px] p-2 rounded-lg bg-black/50 border border-sakura-400 text-sm text-white focus:outline-none font-vazir"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-vazir"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-2.5 py-1 rounded bg-sakura-500 text-white font-medium hover:bg-sakura-600 font-vazir"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className={`markdown-body text-sm leading-relaxed overflow-x-auto font-vazir ${isAssistant ? 'assistant-response font-vazir' : ''}`} dir="auto">
            {isAssistant ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  em: ({ children }) => {
                    const text = String(children);
                    const isSingleWord = text.trim().split(/\s+/).length <= 1 && !/[.!؟،,]/.test(text);

                    if (isSingleWord) {
                      return <em className="narration-inline font-medium not-italic font-vazir">{children}</em>;
                    }

                    return (
                      <span className="narration-action block my-2.5 px-3.5 py-2 rounded-xl text-[0.91rem] shadow-sm select-text leading-relaxed font-vazir">
                        <span className="inline-block text-purple-400 text-xs font-semibold me-2 not-italic select-none">✦</span>
                        {children}
                      </span>
                    );
                  },
                  p: ({ children }) => (
                    <p className="mb-2 leading-relaxed font-vazir" dir="auto">
                      {children}
                    </p>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap break-words font-vazir" dir="auto">{message.content}</p>
            )}

            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-sakura-400 animate-pulse rounded-full align-middle" />
            )}
          </div>
        )}
      </div>

      {/* Hover action toolbar */}
      <div
        className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 px-1 text-slate-400 text-xs ${
          isAssistant ? 'justify-start' : 'justify-end'
        }`}
      >
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-slate-800/80 hover:text-white transition"
          title="Copy text"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {isAssistant && onSpeak && (
          <button
            onClick={() => (isAudioPlaying ? onStopAudio?.() : onSpeak(message.content))}
            className={`p-1 rounded hover:bg-slate-800/80 transition ${
              isAudioPlaying ? 'text-sakura-400 animate-pulse' : 'hover:text-white'
            }`}
            title={isAudioPlaying ? 'Stop speech' : 'Play text-to-speech'}
          >
            {isAudioPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {isAssistant && onRegenerate && (
          <button
            onClick={onRegenerate}
            className="p-1 rounded hover:bg-slate-800/80 hover:text-white transition"
            title="Regenerate response"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {onEdit && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 rounded hover:bg-slate-800/80 hover:text-white transition"
            title="Edit message"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
