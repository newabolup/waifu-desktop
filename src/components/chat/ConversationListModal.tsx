import React, { useState } from 'react';
import { ConversationSession, ChatMessage } from '../../types/conversation';
import {
  X,
  Plus,
  Pin,
  Trash2,
  Edit2,
  Check,
  Search,
  Download,
  MessageSquare,
} from 'lucide-react';

interface ConversationListModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationSession[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onExportConversation: (id: string, format: 'json' | 'markdown') => void;
}

export const ConversationListModal: React.FC<ConversationListModalProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onRenameConversation,
  onTogglePinConversation,
  onDeleteConversation,
  onExportConversation,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!isOpen) return null;

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (conv: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-xl bg-[#121524] border border-sakura-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sakura-400" />
            <h3 className="text-lg font-bold text-white">Conversation History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & New button */}
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sakura-500/50"
            />
          </div>
          <button
            onClick={() => {
              onCreateConversation();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-sakura-600 hover:bg-sakura-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No conversations found.
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectConversation(conv.id);
                      onClose();
                    }
                  }}
                  className={`group relative p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-sakura-950/30 border-sakura-500/40 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinConversation(conv.id);
                      }}
                      className={`p-1 rounded hover:bg-slate-800 transition ${
                        conv.isPinned ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={conv.isPinned ? 'Unpin' : 'Pin conversation'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-2 py-0.5 rounded bg-black/60 border border-sakura-500 text-xs text-white focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => saveRename(conv.id, e)}
                          className="p-1 rounded bg-sakura-600 text-white hover:bg-sakura-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-200 truncate">
                            {conv.title}
                          </h4>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sakura-600/30 text-sakura-300 font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {new Date(conv.updatedAt).toLocaleDateString()} at{' '}
                          {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportConversation(conv.id, 'markdown');
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Export as Markdown"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => startRename(conv, e)}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {conversations.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete conversation "${conv.title}"?`)) {
                              onDeleteConversation(conv.id);
                            }
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
