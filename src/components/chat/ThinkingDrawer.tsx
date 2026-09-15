import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react';

interface ThinkingDrawerProps {
  thoughts: string;
}

export const ThinkingDrawer: React.FC<ThinkingDrawerProps> = ({ thoughts }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!thoughts || !thoughts.trim()) return null;

  return (
    <div className="mb-2 rounded-xl overflow-hidden border border-purple-500/20 bg-purple-950/20 text-xs transition">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 flex items-center justify-between text-purple-300/80 hover:text-purple-200 hover:bg-purple-900/30 transition text-left"
      >
        <div className="flex items-center gap-1.5">
          <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-mono font-medium">Thought Process</span>
          <span className="text-[10px] text-purple-400/60 font-mono">({thoughts.length} chars)</span>
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="px-3 py-2 border-t border-purple-500/20 bg-black/40 text-purple-200/90 whitespace-pre-wrap font-mono leading-relaxed max-h-52 overflow-y-auto select-text">
          {thoughts}
        </div>
      )}
    </div>
  );
};
