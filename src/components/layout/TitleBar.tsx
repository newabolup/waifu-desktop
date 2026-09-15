import React, { useState } from 'react';
import { Minus, Square, Copy, X, Sparkles, Heart } from 'lucide-react';

interface TitleBarProps {
  characterName: string;
  stageName: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ characterName, stageName }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.minimize) {
      (window as any).electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.maximize) {
      (window as any).electronAPI.maximize();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.close) {
      (window as any).electronAPI.close();
    }
  };

  return (
    <header className="h-9 w-full bg-[#080910] border-b border-slate-800/80 flex items-center justify-between px-3 select-none titlebar-drag-region z-50">
      {/* App brand & status */}
      <div className="flex items-center gap-2 titlebar-no-drag">
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-sakura-600 to-rose-400 flex items-center justify-center text-[9px] font-bold text-white shadow-sm shadow-sakura-500/50">
          🌸
        </div>
        <span className="text-xs font-bold text-slate-200 tracking-wide">Kizuna AI</span>
        <span className="text-[10px] text-slate-500 font-mono">v1.0</span>
        <span className="text-slate-600 text-xs">•</span>
        <div className="flex items-center gap-1 text-[11px] text-sakura-400/90 font-medium">
          <Heart className="w-3 h-3 fill-sakura-400/50" />
          <span>{characterName}</span>
          <span className="text-slate-500">({stageName})</span>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center titlebar-no-drag">
        <button
          onClick={handleMinimize}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
