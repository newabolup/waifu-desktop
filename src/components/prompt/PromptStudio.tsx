import React, { useState } from 'react';
import { CharacterProfile } from '../../types/character';
import { EmotionalState } from '../../types/emotion';
import { RelationshipProgress } from '../../types/relationship';
import { UserProfile } from '../../types/settings';
import { promptEngine } from '../../services/prompt/promptEngine';
import {
  FileText,
  Eye,
  Sliders,
  Sparkles,
  Check,
  Copy,
  Info,
  Shield,
  Heart,
  MessageSquare,
  Cpu,
} from 'lucide-react';

interface PromptStudioProps {
  character: CharacterProfile;
  emotionalState: EmotionalState;
  relationship: RelationshipProgress;
  userProfile: UserProfile;
  onSaveCharacter: (char: CharacterProfile) => void;
}

export const PromptStudio: React.FC<PromptStudioProps> = ({
  character,
  emotionalState,
  relationship,
  userProfile,
  onSaveCharacter,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'inspector'>('visual');
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Editable sections
  const [personality, setPersonality] = useState(character.personality);
  const [speakingStyle, setSpeakingStyle] = useState(character.speakingStyle);
  const [backstory, setBackstory] = useState(character.backstory);
  const [appearance, setAppearance] = useState(character.appearance);
  const [rules, setRules] = useState(character.rules.join('\n'));
  const [boundaries, setBoundaries] = useState(character.boundaries.join('\n'));
  const [customRules, setCustomRules] = useState(character.customRules.join('\n'));

  // Compile live preview of final assembled prompt
  const assembledPrompt = promptEngine.compileSystemPrompt({
    character: {
      ...character,
      personality,
      speakingStyle,
      backstory,
      appearance,
      rules: rules.split('\n').filter(Boolean),
      boundaries: boundaries.split('\n').filter(Boolean),
      customRules: customRules.split('\n').filter(Boolean),
    },
    emotionalState,
    relationship,
    userProfile,
  });

  const estimatedTokens = promptEngine.estimateTokens(assembledPrompt);

  const handleSave = () => {
    const updated: CharacterProfile = {
      ...character,
      personality: personality.trim(),
      speakingStyle: speakingStyle.trim(),
      backstory: backstory.trim(),
      appearance: appearance.trim(),
      rules: rules.split('\n').map((s) => s.trim()).filter(Boolean),
      boundaries: boundaries.split('\n').map((s) => s.trim()).filter(Boolean),
      customRules: customRules.split('\n').map((s) => s.trim()).filter(Boolean),
      updatedAt: Date.now(),
    };

    onSaveCharacter(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(assembledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f1a] text-slate-100 select-none">
      {/* Top Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#131627]/60">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-sakura-400" />
          <div>
            <h1 className="text-base font-bold text-white">Prompt Studio & Context Compiler</h1>
            <p className="text-xs text-slate-400">
              Customize modular prompt layers or inspect the final assembled context.
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'visual'
                  ? 'bg-sakura-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Visual Sections
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'inspector'
                  ? 'bg-sakura-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Assembled Prompt Inspector
            </button>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-sakura-600/30 flex items-center gap-1.5 transition"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
            {isSaved ? 'Saved!' : 'Save Prompt'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'visual' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text max-w-5xl mx-auto w-full">
          {/* Section 1: Core Persona */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-bold text-sakura-300 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                1. Core Persona & Identity
              </span>
              <span className="text-xs text-slate-500">Injected at top of prompt</span>
            </div>
            <p className="text-xs text-slate-400">
              Defines who {character.name} is, her primary disposition, and psychological profile.
            </p>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
            />
          </div>

          {/* Section 2: Speaking Style */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-bold text-sakura-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                2. Speaking Style & Linguistic Quirks
              </span>
              <span className="text-xs text-slate-500">Guides tone & vocabulary</span>
            </div>
            <p className="text-xs text-slate-400">
              Sentence rhythm, honorifics, soft sigh actions, verbal quirks, and emotional cadence.
            </p>
            <textarea
              value={speakingStyle}
              onChange={(e) => setSpeakingStyle(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
            />
          </div>

          {/* Section 3: Rules & Boundaries */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-bold text-sakura-300 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                3. Rules of Engagement & Boundaries
              </span>
              <span className="text-xs text-slate-500">Behavioral constraints</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Core Rules (One per line)
              </label>
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Boundaries & Safety Limits (One per line)
              </label>
              <textarea
                value={boundaries}
                onChange={(e) => setBoundaries(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Custom User Directives (One per line)
              </label>
              <textarea
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                rows={2}
                placeholder="e.g. Always wish me good luck before I go to work."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Assembled Prompt Inspector */
        <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-5xl mx-auto w-full">
          {/* Metadata bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 mb-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400">
                Estimated Tokens: <strong className="text-sakura-400 font-mono">~{estimatedTokens}</strong>
              </span>
              <span className="text-slate-400">
                Characters: <strong className="text-slate-200 font-mono">{assembledPrompt.length}</strong>
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Auto-assembled from Persona + Relationship + Emotions + Memories + User Profile
              </span>
            </div>

            <button
              onClick={handleCopyPrompt}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Prompt'}
            </button>
          </div>

          {/* Raw Prompt Output */}
          <div className="flex-1 p-4 rounded-2xl bg-black/60 border border-slate-800 text-slate-300 font-mono text-xs overflow-y-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
            {assembledPrompt}
          </div>
        </div>
      )}
    </div>
  );
};
