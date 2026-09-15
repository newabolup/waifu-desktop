import React from 'react';
import {
  MessageSquare,
  User,
  Brain,
  FileText,
  Server,
  Heart,
  Smile,
  Bell,
  Volume2,
  Terminal,
  Settings,
} from 'lucide-react';

export type ActiveTab =
  | 'chat'
  | 'characters'
  | 'memory'
  | 'prompts'
  | 'providers'
  | 'relationship'
  | 'emotions'
  | 'scheduled'
  | 'voice'
  | 'debug'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  memoryCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  memoryCount,
}) => {
  const navItems = [
    { key: 'chat', label: 'Chat', icon: MessageSquare },
    { key: 'characters', label: 'Characters', icon: User },
    { key: 'memory', label: 'Memory', icon: Brain, badge: memoryCount },
    { key: 'prompts', label: 'Prompts', icon: FileText },
    { key: 'providers', label: 'Providers', icon: Server },
    { key: 'relationship', label: 'Relationship', icon: Heart },
    { key: 'emotions', label: 'Emotions', icon: Smile },
    { key: 'scheduled', label: 'Proactive', icon: Bell },
    { key: 'voice', label: 'Voice / TTS', icon: Volume2 },
    { key: 'debug', label: 'Diagnostics', icon: Terminal },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-16 md:w-56 h-full bg-[#0a0c16] border-r border-slate-800/80 flex flex-col justify-between py-4 select-none z-20 flex-shrink-0">
      <div className="space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key as ActiveTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all relative ${
                isActive
                  ? 'bg-sakura-600/30 text-sakura-300 border border-sakura-500/40 shadow-sm shadow-sakura-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-sakura-400' : 'text-slate-400'}`} />
              <span className="hidden md:inline truncate">{item.label}</span>

              {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                <span className="hidden md:inline-block ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-sakura-950 text-sakura-400 border border-sakura-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className="px-4 text-[10px] text-slate-500 hidden md:block">
        <p className="font-semibold text-slate-400">Kizuna Desktop</p>
        <p>Local-first AI Waifu</p>
      </div>
    </aside>
  );
};
