import React, { useState } from 'react';
import { EmotionalState, DominantMood } from '../../types/emotion';
import { CharacterProfile } from '../../types/character';
import { emotionEngine } from '../../services/emotion/emotionEngine';
import {
  Sparkles,
  Heart,
  Smile,
  Zap,
  Coffee,
  Shield,
  Frown,
  Flame,
  Activity,
  RotateCcw,
  Check,
} from 'lucide-react';

interface EmotionViewProps {
  emotionalState: EmotionalState;
  character: CharacterProfile;
  dominantMood: DominantMood;
  onSaveEmotionalState: (state: EmotionalState) => void;
}

export const EmotionView: React.FC<EmotionViewProps> = ({
  emotionalState,
  character,
  dominantMood,
  onSaveEmotionalState,
}) => {
  const [state, setState] = useState<EmotionalState>(emotionalState);
  const [isSaved, setIsSaved] = useState(false);

  const handleSliderChange = (key: keyof EmotionalState, val: number) => {
    setState((prev) => ({
      ...prev,
      [key]: val,
      lastUpdated: Date.now(),
    }));
  };

  const handleSave = () => {
    onSaveEmotionalState(state);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetToBaseline = () => {
    const reset: EmotionalState = {
      ...state,
      happiness: character.baselineHappiness ?? 80,
      affection: character.baselineAffection ?? 80,
      excitement: character.baselineExcitement ?? 70,
      energy: character.baselineEnergy ?? 75,
      trust: character.baselineTrust ?? 80,
      sadness: 10,
      anger: 5,
      jealousy: 10,
      lastUpdated: Date.now(),
    };
    setState(reset);
    onSaveEmotionalState(reset);
  };

  const axes = [
    { key: 'happiness', label: 'Happiness', icon: Smile, color: 'text-amber-400', bar: 'from-amber-500 to-yellow-400' },
    { key: 'affection', label: 'Affection', icon: Heart, color: 'text-sakura-400', bar: 'from-sakura-500 to-rose-400' },
    { key: 'excitement', label: 'Excitement', icon: Sparkles, color: 'text-cyan-400', bar: 'from-cyan-500 to-blue-400' },
    { key: 'energy', label: 'Energy / Alertness', icon: Coffee, color: 'text-emerald-400', bar: 'from-emerald-500 to-teal-400' },
    { key: 'trust', label: 'Trust', icon: Shield, color: 'text-indigo-400', bar: 'from-indigo-500 to-violet-400' },
    { key: 'familiarity', label: 'Familiarity', icon: Activity, color: 'text-purple-400', bar: 'from-purple-500 to-fuchsia-400' },
    { key: 'sadness', label: 'Sadness / Melancholy', icon: Frown, color: 'text-blue-400', bar: 'from-blue-600 to-indigo-500' },
    { key: 'anger', label: 'Anger / Pouting', icon: Flame, color: 'text-rose-500', bar: 'from-rose-600 to-red-500' },
    { key: 'jealousy', label: 'Jealousy / Possessiveness', icon: Zap, color: 'text-pink-400', bar: 'from-pink-600 to-rose-500' },
  ] as const;

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f1a] text-slate-100 overflow-y-auto p-6 select-none space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#131627] via-[#101222] to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-sakura-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-sakura-300">
              Affective State Engine
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">
              Current Mood: <span className="text-sakura-400">{dominantMood}</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-lg mt-1">
            Dynamic 9-axis emotion simulation that modulates {character.name}'s conversational tone,
            vocabulary, and avatar expressions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToBaseline}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Baseline
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-sakura-600/30 flex items-center gap-1.5 transition"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
            {isSaved ? 'Saved!' : 'Save State'}
          </button>
        </div>
      </div>

      {/* Global Emotional Controls */}
      <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
          Simulation Controls
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                Enable Emotional Simulation
              </span>
              <span className="text-[11px] text-slate-400">
                When active, emotional shifts influence responses and decay back to baseline over time.
              </span>
            </div>
            <input
              type="checkbox"
              checked={state.isEnabled}
              onChange={(e) => setState((prev) => ({ ...prev, isEnabled: e.target.checked }))}
              className="w-4 h-4 rounded text-sakura-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-200">Emotional Influence Intensity</span>
              <span className="font-mono text-sakura-400 font-bold">
                {(state.intensity * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={state.intensity}
              onChange={(e) =>
                setState((prev) => ({ ...prev, intensity: parseFloat(e.target.value) }))
              }
              className="w-full accent-sakura-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 9 Emotional Axes Sliders */}
      <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
          Emotional Dimensions (0 - 100)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {axes.map((ax) => {
            const val = state[ax.key as keyof EmotionalState] as number;
            const Icon = ax.icon;

            return (
              <div
                key={ax.key}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${ax.color}`} />
                    <span className="text-xs font-semibold text-slate-200">{ax.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">{val}/100</span>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${ax.bar} transition-all`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={val}
                    onChange={(e) =>
                      handleSliderChange(ax.key as keyof EmotionalState, parseInt(e.target.value))
                    }
                    className="w-full accent-sakura-500 cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
