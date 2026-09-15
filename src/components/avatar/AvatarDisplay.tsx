import React, { useState } from 'react';
import { CharacterProfile, AvatarExpression } from '../../types/character';
import { EmotionalState, DominantMood } from '../../types/emotion';
import { RelationshipProgress } from '../../types/relationship';
import { AnimeCharacterSvg } from './AnimeCharacterSvg';
import { EmotionalAura } from './EmotionalAura';
import { AssetImporterModal } from './AssetImporterModal';
import { Sparkles, Heart, Settings2, Volume2, VolumeX } from 'lucide-react';

interface AvatarDisplayProps {
  character: CharacterProfile;
  emotionalState: EmotionalState;
  relationship: RelationshipProgress;
  dominantMood: DominantMood;
  isTalking?: boolean;
  isAudioPlaying?: boolean;
  onUpdateCharacterAssets: (assets: any) => void;
  onStopAudio?: () => void;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  character,
  emotionalState,
  relationship,
  dominantMood,
  isTalking = false,
  isAudioPlaying = false,
  onUpdateCharacterAssets,
  onStopAudio,
}) => {
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [manualExpression, setManualExpression] = useState<AvatarExpression | null>(null);

  // Compute active expression
  let activeExpression: AvatarExpression = 'idle';
  if (isTalking || isAudioPlaying) {
    activeExpression = 'talking';
  } else if (manualExpression) {
    activeExpression = manualExpression;
  } else {
    // Determine based on mood and emotional values
    if (emotionalState.energy <= 25) activeExpression = 'sleepy';
    else if (emotionalState.anger >= 45) activeExpression = 'angry';
    else if (emotionalState.sadness >= 45) activeExpression = 'sad';
    else if (emotionalState.jealousy >= 45) activeExpression = 'blushing';
    else if (emotionalState.excitement >= 75) activeExpression = 'surprised';
    else if (emotionalState.happiness >= 75 || emotionalState.affection >= 75) activeExpression = 'happy';
    else activeExpression = 'idle';
  }

  const currentStage =
    relationship.stages.find((s) => s.id === relationship.currentStageId) ||
    relationship.stages[0];

  const customSprite = character.avatarAssets?.[activeExpression];

  return (
    <div className="relative flex flex-col items-center justify-between h-full w-full p-4 select-none">
      {/* Dynamic Emotional Aura Background */}
      <EmotionalAura mood={dominantMood} state={emotionalState} />

      {/* Top Status Badges */}
      <div className="w-full flex items-center justify-between z-10">
        {/* Stage & Affinity */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-sakura-500/20 backdrop-blur-md">
          <Heart className="w-3.5 h-3.5 text-sakura-400 fill-sakura-400/50" />
          <span className="text-xs font-semibold text-slate-200">{currentStage.name}</span>
          <span className="text-[10px] text-sakura-400 font-mono">({relationship.affinityPoints} pts)</span>
        </div>

        {/* Mood Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-700/50 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-medium text-slate-300">{dominantMood}</span>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-1">
          {isAudioPlaying && (
            <button
              onClick={onStopAudio}
              className="p-1.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/40 hover:bg-rose-900/80 transition"
              title="Stop voice"
            >
              <VolumeX className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="p-1.5 rounded-full bg-slate-900/70 text-slate-400 border border-slate-700/50 hover:text-white hover:border-sakura-500/30 transition"
            title="Import custom expression sprites"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Avatar Center Stage */}
      <div className="relative flex-1 flex items-center justify-center w-full my-2">
        {customSprite ? (
          <div className="relative w-72 h-80 flex items-center justify-center overflow-hidden rounded-3xl group">
            <img
              src={customSprite}
              alt={character.name}
              className={`w-full h-full object-contain filter drop-shadow-2xl transition-transform duration-300 ${
                isTalking ? 'scale-105 animate-pulse' : ''
              }`}
            />
          </div>
        ) : (
          <AnimeCharacterSvg
            expression={activeExpression}
            isTalking={isTalking || isAudioPlaying}
            className="w-full h-full max-w-[340px]"
          />
        )}
      </div>

      {/* Bottom Info Bar: Character Name & Interactive Expression Bar */}
      <div className="w-full flex flex-col items-center gap-2 z-10">
        <div className="text-center">
          <h3 className="text-base font-bold text-white tracking-wide flex items-center justify-center gap-1.5">
            {character.name}
            {isTalking && (
              <span className="inline-block w-2 h-2 rounded-full bg-sakura-400 animate-ping" />
            )}
          </h3>
          <p className="text-[11px] text-slate-400 font-normal truncate max-w-[240px]">
            {character.personality.split('.')[0]}.
          </p>
        </div>

        {/* Quick Expression Preview Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/60 border border-slate-800/60 backdrop-blur-md">
          {(['idle', 'happy', 'blushing', 'surprised', 'pouting', 'sleepy'] as const).map((expr) => {
            const mappedExpr: AvatarExpression = expr === 'pouting' ? 'angry' : expr;
            const isSelected = activeExpression === mappedExpr;
            return (
              <button
                key={expr}
                onClick={() => setManualExpression(manualExpression === mappedExpr ? null : mappedExpr)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-lg capitalize transition ${
                  isSelected
                    ? 'bg-sakura-600/40 text-sakura-300 border border-sakura-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {expr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Asset Importer Modal */}
      <AssetImporterModal
        character={character}
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onSave={(newAssets) => {
          onUpdateCharacterAssets(newAssets);
        }}
      />
    </div>
  );
};
