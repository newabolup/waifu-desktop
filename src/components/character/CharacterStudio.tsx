import React, { useState } from 'react';
import { CharacterProfile } from '../../types/character';
import {
  User,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  Sparkles,
  Heart,
  BookOpen,
  MessageCircle,
  Shield,
  Sliders,
} from 'lucide-react';

interface CharacterStudioProps {
  characters: CharacterProfile[];
  activeCharacter: CharacterProfile;
  onSaveCharacter: (char: CharacterProfile) => void;
  onDeleteCharacter: (id: string) => void;
  onSelectActiveCharacter: (id: string) => void;
}

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  characters,
  activeCharacter,
  onSaveCharacter,
  onDeleteCharacter,
  onSelectActiveCharacter,
}) => {
  const [selectedChar, setSelectedChar] = useState<CharacterProfile>(activeCharacter);
  const [isSaved, setIsSaved] = useState(false);

  // Form states
  const [name, setName] = useState(selectedChar.name);
  const [ageLabel, setAgeLabel] = useState(selectedChar.ageLabel || '');
  const [appearance, setAppearance] = useState(selectedChar.appearance);
  const [personality, setPersonality] = useState(selectedChar.personality);
  const [backstory, setBackstory] = useState(selectedChar.backstory);
  const [speakingStyle, setSpeakingStyle] = useState(selectedChar.speakingStyle);
  const [likesInput, setLikesInput] = useState(selectedChar.likes.join('\n'));
  const [dislikesInput, setDislikesInput] = useState(selectedChar.dislikes.join('\n'));
  const [rulesInput, setRulesInput] = useState(selectedChar.rules.join('\n'));
  const [boundariesInput, setBoundariesInput] = useState(selectedChar.boundaries.join('\n'));
  const [customRulesInput, setCustomRulesInput] = useState(selectedChar.customRules.join('\n'));

  const selectChar = (c: CharacterProfile) => {
    setSelectedChar(c);
    setName(c.name);
    setAgeLabel(c.ageLabel || '');
    setAppearance(c.appearance);
    setPersonality(c.personality);
    setBackstory(c.backstory);
    setSpeakingStyle(c.speakingStyle);
    setLikesInput(c.likes.join('\n'));
    setDislikesInput(c.dislikes.join('\n'));
    setRulesInput(c.rules.join('\n'));
    setBoundariesInput(c.boundaries.join('\n'));
    setCustomRulesInput(c.customRules.join('\n'));
  };

  const handleSave = () => {
    const updated: CharacterProfile = {
      ...selectedChar,
      name: name.trim() || 'Companion',
      ageLabel: ageLabel.trim(),
      appearance: appearance.trim(),
      personality: personality.trim(),
      backstory: backstory.trim(),
      speakingStyle: speakingStyle.trim(),
      likes: likesInput.split('\n').map((s) => s.trim()).filter(Boolean),
      dislikes: dislikesInput.split('\n').map((s) => s.trim()).filter(Boolean),
      rules: rulesInput.split('\n').map((s) => s.trim()).filter(Boolean),
      boundaries: boundariesInput.split('\n').map((s) => s.trim()).filter(Boolean),
      customRules: customRulesInput.split('\n').map((s) => s.trim()).filter(Boolean),
      updatedAt: Date.now(),
    };

    onSaveCharacter(updated);
    setSelectedChar(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCreateNew = () => {
    const newChar: CharacterProfile = {
      id: 'char-' + Math.random().toString(36).substring(2, 9),
      name: 'New Companion',
      ageLabel: '20 (fictional)',
      appearance: 'Slender anime companion with shining silver hair and luminous blue eyes.',
      personality: 'Warm, inquisitive, and loyal.',
      backstory: 'A devoted companion who arrived to support you.',
      speakingStyle: 'Affectionate, natural, and expressive.',
      likes: ['Quiet evenings', 'Warm tea', 'Learning about you'],
      dislikes: ['Dishonesty', 'Cold loneliness'],
      rules: ['Always stay in character.'],
      boundaries: ['Respect personal comfort.'],
      customRules: [],
      avatarAssets: {},
      baselineHappiness: 80,
      baselineAffection: 80,
      baselineExcitement: 70,
      baselineEnergy: 75,
      baselineTrust: 80,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onSaveCharacter(newChar);
    selectChar(newChar);
  };

  const handleExportCard = () => {
    const jsonStr = JSON.stringify(selectedChar, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedChar.name.toLowerCase().replace(/\s+/g, '_')}_card.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCard = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.name && imported.personality) {
          imported.id = 'char-' + Math.random().toString(36).substring(2, 9);
          imported.isActive = false;
          onSaveCharacter(imported);
          selectChar(imported);
        }
      } catch (err) {
        alert('Invalid character card JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full w-full bg-[#0d0f1a] text-slate-100 overflow-hidden select-none">
      {/* Left Character List Sidebar */}
      <div className="w-72 border-r border-slate-800 bg-[#101222]/80 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-sakura-400" />
            <h2 className="text-base font-bold text-white">Characters</h2>
          </div>
          <button
            onClick={handleCreateNew}
            className="p-1.5 rounded-lg bg-sakura-600/30 text-sakura-300 hover:bg-sakura-600/50 transition"
            title="Create New Character"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {characters.map((char) => {
            const isSelected = char.id === selectedChar.id;
            const isActive = char.id === activeCharacter.id;

            return (
              <div
                key={char.id}
                onClick={() => selectChar(char)}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-sakura-950/40 border-sakura-500/50 shadow-md'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200 truncate">{char.name}</span>
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{char.ageLabel || 'Anime Companion'}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Import Card button */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <label className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-sakura-500/30 text-xs text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-sakura-400" />
            Import Character Card
            <input type="file" accept=".json" onChange={handleImportCard} className="hidden" />
          </label>
        </div>
      </div>

      {/* Right Character Editor Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Action Bar */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#131627]/60">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">{name || 'Unnamed'}</h1>
            {selectedChar.id === activeCharacter.id ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-sakura-600/30 text-sakura-300 font-semibold border border-sakura-500/40">
                Active Partner
              </span>
            ) : (
              <button
                onClick={() => onSelectActiveCharacter(selectedChar.id)}
                className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-sakura-600 hover:text-white transition"
              >
                Set as Active Partner
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCard}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition"
              title="Export Character Card"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>

            {characters.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`Delete character "${selectedChar.name}"?`)) {
                    onDeleteCharacter(selectedChar.id);
                  }
                }}
                className="p-1.5 rounded-xl bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
                title="Delete Character"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-sakura-600/30 flex items-center gap-1.5 transition"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
              {isSaved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Scrollable Form Fields */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
          {/* Section 1: Basic Identity */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-sakura-300 border-b border-slate-800 pb-2">
              <User className="w-4 h-4" />
              Basic Identity
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Character Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Age Label (fictional)</label>
                <input
                  type="text"
                  value={ageLabel}
                  onChange={(e) => setAgeLabel(e.target.value)}
                  placeholder="e.g. 20 (fictional)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personality & Speaking Style */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-sakura-300 border-b border-slate-800 pb-2">
              <MessageCircle className="w-4 h-4" />
              Persona & Speaking Style
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Personality Traits</label>
              <textarea
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Speaking Style & Tone</label>
              <textarea
                value={speakingStyle}
                onChange={(e) => setSpeakingStyle(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
          </div>

          {/* Section 3: Appearance & Backstory */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-sakura-300 border-b border-slate-800 pb-2">
              <BookOpen className="w-4 h-4" />
              Appearance & Backstory
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Visual Appearance & Clothing</label>
              <textarea
                value={appearance}
                onChange={(e) => setAppearance(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Backstory & Lore</label>
              <textarea
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
          </div>

          {/* Section 4: Likes & Dislikes */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-sakura-300 border-b border-slate-800 pb-2">
              <Heart className="w-4 h-4" />
              Likes & Dislikes (One per line)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Likes & Favorite Topics</label>
                <textarea
                  value={likesInput}
                  onChange={(e) => setLikesInput(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Dislikes & Aversions</label>
                <textarea
                  value={dislikesInput}
                  onChange={(e) => setDislikesInput(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Behavioral Rules & Boundaries */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-sakura-300 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4" />
              Rules & Boundaries (One per line)
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Behavioral Rules</label>
              <textarea
                value={rulesInput}
                onChange={(e) => setRulesInput(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Boundaries</label>
              <textarea
                value={boundariesInput}
                onChange={(e) => setBoundariesInput(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
