import React, { useState } from 'react';
import { RelationshipProgress, RelationshipStage } from '../../types/relationship';
import { relationshipEngine } from '../../services/relationship/relationshipEngine';
import {
  Heart,
  Sparkles,
  Edit2,
  Plus,
  Trash2,
  Calendar,
  Check,
  X,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RelationshipViewProps {
  relationship: RelationshipProgress;
  characterName: string;
  onSaveRelationship: (rel: RelationshipProgress) => void;
}

export const RelationshipView: React.FC<RelationshipViewProps> = ({
  relationship,
  characterName,
  onSaveRelationship,
}) => {
  const [editingStage, setEditingStage] = useState<RelationshipStage | null>(null);

  const currentStage = relationshipEngine.getCurrentStage(relationship);
  const nextStage = relationshipEngine.getNextStage(relationship);

  // Calculate percentage to next stage
  let progressPct = 100;
  let pointsNeeded = 0;
  if (nextStage) {
    const range = nextStage.minPoints - currentStage.minPoints;
    const currentInRange = relationship.affinityPoints - currentStage.minPoints;
    progressPct = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
    pointsNeeded = nextStage.minPoints - relationship.affinityPoints;
  }

  const handleManualAddPoints = async (pts: number) => {
    const res = await relationshipEngine.addAffinity(
      relationship.characterId,
      pts,
      `Spent meaningful time talking with ${characterName}`
    );
    if (res.newMilestone) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    onSaveRelationship(res.progress);
  };

  const handleSaveStageEdit = () => {
    if (!editingStage) return;
    const updatedStages = relationship.stages.map((s) =>
      s.id === editingStage.id ? editingStage : s
    );
    const updated: RelationshipProgress = {
      ...relationship,
      stages: updatedStages,
      updatedAt: Date.now(),
    };
    onSaveRelationship(updated);
    setEditingStage(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f1a] text-slate-100 overflow-y-auto p-6 select-none space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-sakura-950/40 via-[#131627] to-[#101222] border border-sakura-500/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-sakura-400 fill-sakura-400" />
              <span className="text-xs uppercase font-bold tracking-wider text-sakura-300">
                Bond Status with {characterName}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              {currentStage.name}
            </h1>
            <p className="text-xs text-slate-300 max-w-lg mt-1 leading-relaxed">
              {currentStage.description}
            </p>
          </div>

          {/* Points Card & Manual Boost for Testing */}
          <div className="flex flex-col items-end gap-2">
            <div className="px-4 py-2 rounded-2xl bg-black/40 border border-sakura-500/30 text-right">
              <span className="text-[11px] text-slate-400 block">Total Affinity</span>
              <span className="text-2xl font-mono font-black text-sakura-400">
                {relationship.affinityPoints}{' '}
                <span className="text-xs font-normal text-slate-400">pts</span>
              </span>
            </div>
            <button
              onClick={() => handleManualAddPoints(20)}
              className="px-3 py-1 rounded-xl bg-sakura-600/30 hover:bg-sakura-600/50 text-sakura-300 border border-sakura-500/30 text-xs font-medium transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              +20 Affinity Boost (Test)
            </button>
          </div>
        </div>

        {/* Progress Bar to next stage */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
            <span>Progress to Next Stage: {nextStage ? nextStage.name : 'Max Level'}</span>
            <span>{nextStage ? `${progressPct}% (${pointsNeeded} pts remaining)` : '100%'}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sakura-600 via-rose-500 to-pink-400 transition-all duration-500 shadow-sm"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Stages & Milestone History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stages List */}
        <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-sakura-400" />
              Relationship Stages & Progression Rules
            </h3>
            <span className="text-xs text-slate-500">Fully Editable</span>
          </div>

          <div className="space-y-3 select-text">
            {relationship.stages.map((stage, idx) => {
              const isCurrent = stage.id === relationship.currentStageId;
              const isUnlocked = relationship.affinityPoints >= stage.minPoints;

              return (
                <div
                  key={stage.id}
                  className={`p-3.5 rounded-xl border transition ${
                    isCurrent
                      ? 'bg-sakura-950/40 border-sakura-500/50'
                      : isUnlocked
                      ? 'bg-slate-900/40 border-slate-800'
                      : 'bg-slate-950/30 border-slate-850 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-sakura-400">
                        Stage {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white">{stage.name}</h4>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-sakura-600/30 text-sakura-300 font-semibold border border-sakura-500/30">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{stage.minPoints} pts</span>
                      <button
                        onClick={() => setEditingStage(stage)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Edit Stage"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mb-1.5">{stage.description}</p>
                  <div className="p-2 rounded bg-black/40 text-[11px] text-slate-400 font-mono">
                    <strong>Prompt Modifier:</strong> {stage.promptModifier}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sakura-400" />
              Relationship Milestone Timeline
            </h3>
            <span className="text-xs text-slate-500">Persistent History</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 select-text">
            {relationship.milestones.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No milestones recorded yet. Converse with {characterName} to unlock milestones!
              </div>
            ) : (
              relationship.milestones
                .slice()
                .reverse()
                .map((ms) => (
                  <div
                    key={ms.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-sakura-950/60 border border-sakura-500/30 flex items-center justify-center flex-shrink-0 text-sakura-400">
                      <Heart className="w-3.5 h-3.5 fill-sakura-400/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-200">{ms.stageName}</h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(ms.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{ms.eventDescription}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Stage Modal */}
      {editingStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#121524] border border-sakura-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sakura-400" />
                Edit Stage: {editingStage.name}
              </h3>
              <button onClick={() => setEditingStage(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Stage Name</label>
              <input
                type="text"
                value={editingStage.name}
                onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Minimum Points</label>
              <input
                type="number"
                value={editingStage.minPoints}
                onChange={(e) => setEditingStage({ ...editingStage, minPoints: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <textarea
                value={editingStage.description}
                onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                rows={2}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Stage Prompt Guidance (Injected into AI context)
              </label>
              <textarea
                value={editingStage.promptModifier}
                onChange={(e) => setEditingStage({ ...editingStage, promptModifier: e.target.value })}
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingStage(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStageEdit}
                className="px-4 py-1.5 rounded-lg bg-sakura-600 hover:bg-sakura-500 text-white text-xs font-semibold shadow"
              >
                Save Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
