import React, { useState, useEffect } from 'react';
import { MemoryItem, MemoryCategory, NegativeMemoryRule } from '../../types/memory';
import { memoryEngine } from '../../services/memory/memoryEngine';
import {
  Brain,
  Search,
  Plus,
  Pin,
  ShieldAlert,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  Sparkles,
  Clock,
  Filter,
} from 'lucide-react';

interface MemoryManagerProps {
  characterId: string;
}

const CATEGORIES: { key: MemoryCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'fact', label: 'Facts' },
  { key: 'preference', label: 'Preferences' },
  { key: 'habit', label: 'Habits' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'event', label: 'Events' },
  { key: 'emotional', label: 'Emotional' },
  { key: 'correction', label: 'Corrections' },
];

export const MemoryManager: React.FC<MemoryManagerProps> = ({ characterId }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [blacklist, setBlacklist] = useState<NegativeMemoryRule[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);

  // New Memory Modal State
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('fact');
  const [newImportance, setNewImportance] = useState(7);
  const [newIsPermanent, setNewIsPermanent] = useState(false);
  const [newIsPinned, setNewIsPinned] = useState(false);

  // New Blacklist rule state
  const [newBlacklistPattern, setNewBlacklistPattern] = useState('');

  const loadData = async () => {
    const mems = await memoryEngine.getAllMemories(characterId);
    setMemories(mems);
    const bl = await memoryEngine.getBlacklist();
    setBlacklist(bl);
  };

  useEffect(() => {
    loadData();
  }, [characterId]);

  const filteredMemories = memories.filter((m) => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch =
      !search || m.content.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTogglePin = async (mem: MemoryItem) => {
    const updated = { ...mem, isPinned: !mem.isPinned };
    await memoryEngine.saveMemory(updated);
    loadData();
  };

  const handleTogglePermanent = async (mem: MemoryItem) => {
    const updated = { ...mem, isPermanent: !mem.isPermanent };
    await memoryEngine.saveMemory(updated);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this memory?')) {
      await memoryEngine.deleteMemory(id);
      loadData();
    }
  };

  const handleCreateMemory = async () => {
    if (!newContent.trim()) return;

    const mem: MemoryItem = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      characterId,
      category: newCategory,
      content: newContent.trim(),
      confidence: 1.0,
      importance: newImportance,
      isPermanent: newIsPermanent,
      isPinned: newIsPinned,
      accessCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await memoryEngine.saveMemory(mem);
    setIsAddModalOpen(false);
    setNewContent('');
    loadData();
  };

  const handleSaveEdit = async () => {
    if (!editingMemory) return;
    await memoryEngine.saveMemory({
      ...editingMemory,
      updatedAt: Date.now(),
    });
    setEditingMemory(null);
    loadData();
  };

  const handleAddBlacklist = async () => {
    if (!newBlacklistPattern.trim()) return;
    await memoryEngine.addBlacklistRule(newBlacklistPattern.trim());
    setNewBlacklistPattern('');
    loadData();
  };

  const handleDeleteBlacklist = async (id: string) => {
    await memoryEngine.deleteBlacklistRule(id);
    loadData();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f1a] text-slate-100 select-none">
      {/* Top Action Bar */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#131627]/60">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-sakura-400" />
          <div>
            <h1 className="text-base font-bold text-white">Persistent Memory Manager</h1>
            <p className="text-xs text-slate-400">
              Durable knowledge remembered across sessions and injected via hybrid relevance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBlacklistOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Memory Blacklist ({blacklist.length})
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-sakura-600/30 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-[#101222]/40 flex flex-wrap items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                selectedCategory === cat.key
                  ? 'bg-sakura-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recalled memories..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sakura-500/50"
          />
        </div>
      </div>

      {/* Memories Grid / Table */}
      <div className="flex-1 overflow-y-auto p-6 select-text">
        {filteredMemories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <Brain className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">No memories found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Memories are automatically extracted from conversations or can be manually created.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="group relative p-4 rounded-2xl bg-[#141728]/70 border border-slate-800 hover:border-sakura-500/40 transition-all shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Top badges */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-sakura-400 border border-sakura-500/20">
                      {mem.category}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(mem)}
                        className={`p-1 rounded hover:bg-slate-800 transition ${
                          mem.isPinned ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={mem.isPinned ? 'Unpin' : 'Pin memory'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTogglePermanent(mem)}
                        className={`p-1 rounded hover:bg-slate-800 transition ${
                          mem.isPermanent ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={mem.isPermanent ? 'Permanent memory' : 'Mark permanent'}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-slate-200 leading-relaxed break-words font-medium mb-3">
                    {mem.content}
                  </p>
                </div>

                {/* Footer metadata */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 select-none">
                  <div className="flex items-center gap-2">
                    <span>Conf: {(mem.confidence * 100).toFixed(0)}%</span>
                    <span>•</span>
                    <span>Imp: {mem.importance}/10</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => setEditingMemory(mem)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(mem.id)}
                      className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#121524] border border-sakura-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sakura-400" />
                Add Durable Memory
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Memory Content</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                placeholder="e.g. User loves Earl Grey tea and prefers studying with lo-fi music."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Importance (1-10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newImportance}
                  onChange={(e) => setNewImportance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsPinned}
                  onChange={(e) => setNewIsPinned(e.target.checked)}
                  className="rounded border-slate-700 text-sakura-500"
                />
                Pin Memory
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsPermanent}
                  onChange={(e) => setNewIsPermanent(e.target.checked)}
                  className="rounded border-slate-700 text-sakura-500"
                />
                Permanent
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMemory}
                className="px-4 py-1.5 rounded-lg bg-sakura-600 hover:bg-sakura-500 text-white text-xs font-semibold shadow"
              >
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Memory Modal */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#121524] border border-sakura-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sakura-400" />
                Edit Memory
              </h3>
              <button onClick={() => setEditingMemory(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Content</label>
              <textarea
                value={editingMemory.content}
                onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Importance (1-10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={editingMemory.importance}
                  onChange={(e) =>
                    setEditingMemory({ ...editingMemory, importance: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Confidence (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={1.0}
                  value={editingMemory.confidence}
                  onChange={(e) =>
                    setEditingMemory({ ...editingMemory, confidence: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingMemory(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-sakura-600 hover:bg-sakura-500 text-white text-xs font-semibold shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {isBlacklistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#121524] border border-amber-500/30 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Memory Blacklist (Negative Filter)
                </h3>
                <p className="text-xs text-slate-400">
                  Prevent specific keywords, topics, or phrases from ever being remembered.
                </p>
              </div>
              <button onClick={() => setIsBlacklistOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add rule input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newBlacklistPattern}
                onChange={(e) => setNewBlacklistPattern(e.target.value)}
                placeholder="e.g. password, credit card, medical record"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={handleAddBlacklist}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition"
              >
                Add Filter
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              {blacklist.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No negative filters configured.
                </div>
              ) : (
                blacklist.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <span className="text-xs text-slate-200 font-mono font-medium">{rule.pattern}</span>
                    <button
                      onClick={() => handleDeleteBlacklist(rule.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
