import React, { useState } from 'react';
import { AppSettings, ThemePreset, UserProfile } from '../../types/settings';
import { StorageService } from '../../services/storage/db';
import {
  Settings,
  Palette,
  User,
  Brain,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onRefreshAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onRefreshAllData,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [userProfile, setUserProfile] = useState<UserProfile>(settings.userProfile);
  const [interestsText, setInterestsText] = useState((settings.userProfile.interests || []).join(', '));
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const themes: { key: ThemePreset; name: string; desc: string; colors: string }[] = [
    {
      key: 'dark-sakura',
      name: 'Dark Sakura',
      desc: 'Deep indigo midnight with delicate cherry blossom rose highlights',
      colors: 'from-pink-500 to-rose-600',
    },
    {
      key: 'midnight-neon',
      name: 'Midnight Neon',
      desc: 'Cyberpunk obsidian with vibrant electric cyan luminescence',
      colors: 'from-cyan-400 to-blue-500',
    },
    {
      key: 'cyber-dream',
      name: 'Cyber Dream',
      desc: 'Dark violet amethyst with futuristic electric purple glows',
      colors: 'from-purple-500 to-fuchsia-600',
    },
    {
      key: 'light-velvet',
      name: 'Light Velvet',
      desc: 'Soft ivory daylight aesthetic with pastel crimson accents',
      colors: 'from-rose-400 to-pink-300',
    },
  ];

  const handleSave = () => {
    const updatedProfile: UserProfile = {
      ...userProfile,
      interests: interestsText.split(',').map((s) => s.trim()).filter(Boolean),
    };

    const updated: AppSettings = {
      ...localSettings,
      userProfile: updatedProfile,
    };

    onSaveSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportBackup = async () => {
    const jsonStr = await StorageService.getInstance().exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kizuna_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const success = await StorageService.getInstance().importFullBackup(text);
        if (success) {
          setImportStatus('Backup restored successfully!');
          onRefreshAllData();
        } else {
          setImportStatus('Failed to restore backup: invalid JSON format');
        }
      } catch (err: any) {
        setImportStatus(`Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f1a] text-slate-100 overflow-y-auto p-6 select-none space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#131627] via-[#101222] to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-sakura-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-sakura-300">
              System Configuration
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Application Settings</h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Personalize your partner's visual theme, customize your user profile, adjust memory
            token budgets, and create portable JSON backups.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-sakura-600/30 flex items-center gap-1.5 transition"
        >
          {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
          {isSaved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {importStatus && (
        <div className="p-4 rounded-2xl bg-sakura-950/40 border border-sakura-500/30 text-xs text-slate-200 flex items-center justify-between">
          <span>{importStatus}</span>
          <button onClick={() => setImportStatus('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Form Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-text">
        {/* Themes */}
        <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Palette className="w-4 h-4 text-sakura-400" />
            Anime Visual Theme
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {themes.map((th) => {
              const isSelected = localSettings.theme === th.key;

              return (
                <div
                  key={th.key}
                  onClick={() => setLocalSettings({ ...localSettings, theme: th.key })}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sakura-950/40 border-sakura-500 shadow-md'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{th.name}</span>
                      <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${th.colors}`} />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{th.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Sakura Petal Particles
                </span>
                <span className="text-[11px] text-slate-400">
                  Ambient cherry blossom particles gently floating across the UI
                </span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.petalParticles}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, petalParticles: e.target.checked })
                }
                className="w-4 h-4 rounded text-sakura-500"
              />
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <User className="w-4 h-4 text-sakura-400" />
            Your User Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Your Preferred Name / Callsign
              </label>
              <input
                type="text"
                value={userProfile.name}
                onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                placeholder="e.g. Senpai, Alex, Master"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Your Pronouns</label>
              <input
                type="text"
                value={userProfile.pronouns || ''}
                onChange={(e) => setUserProfile({ ...userProfile, pronouns: e.target.value })}
                placeholder="e.g. he/him, they/them, she/her"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Your Hobbies & Interests (Comma-separated)
            </label>
            <input
              type="text"
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              placeholder="e.g. Coding, Anime, Manga, Music, Astronomy"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Notes about you for your companion
            </label>
            <textarea
              value={userProfile.notes || ''}
              onChange={(e) => setUserProfile({ ...userProfile, notes: e.target.value })}
              rows={2}
              placeholder="e.g. Currently studying computer science, likes coffee."
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
          </div>
        </div>

        {/* Memory & Context Preferences */}
        <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Brain className="w-4 h-4 text-sakura-400" />
            Memory & Context Settings
          </h3>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-300">Memory Token Injection Budget</span>
              <span className="font-mono text-sakura-400 font-semibold">
                {localSettings.memoryTokenBudget} tokens
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="2500"
              step="50"
              value={localSettings.memoryTokenBudget}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, memoryTokenBudget: parseInt(e.target.value) })
              }
              className="w-full accent-sakura-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Maximum token space dedicated to injected past memories in the system prompt.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                Automatic Memory Extraction
              </span>
              <span className="text-[11px] text-slate-400">
                Extract meaningful durable facts from conversation turns in the background
              </span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.autoExtractMemories}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, autoExtractMemories: e.target.checked })
              }
              className="w-4 h-4 rounded text-sakura-500"
            />
          </div>
        </div>

        {/* Backup & Data Persistence */}
        <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <HardDrive className="w-4 h-4 text-sakura-400" />
            Full Backup & Portability
          </h3>
          <p className="text-xs text-slate-400">
            Export a portable JSON archive containing all characters, conversations, messages,
            memories, providers, and settings.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleExportBackup}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sakura-500/40 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-sakura-400" />
              Export Full Backup JSON
            </button>

            <label className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sakura-500/40 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-sakura-400" />
              Restore Backup JSON
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
