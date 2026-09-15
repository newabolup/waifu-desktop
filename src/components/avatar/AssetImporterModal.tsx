import React, { useState } from 'react';
import { CharacterProfile, AvatarExpression, CharacterExpressionAssets } from '../../types/character';
import { X, Upload, Check, Image as ImageIcon, Trash2 } from 'lucide-react';

interface AssetImporterModalProps {
  character: CharacterProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAssets: CharacterExpressionAssets) => void;
}

const EXPRESSIONS: { key: AvatarExpression; label: string; desc: string }[] = [
  { key: 'idle', label: 'Default / Idle', desc: 'Used for normal relaxed state' },
  { key: 'talking', label: 'Speaking / Streaming', desc: 'Active mouth movement during voice or streaming' },
  { key: 'happy', label: 'Joyful / Smiling', desc: 'Cheering, laughing, or pleased reactions' },
  { key: 'sad', label: 'Sad / Somber', desc: 'Comforting, sympathetic, or downcast moments' },
  { key: 'angry', label: 'Pouting / Irritated', desc: 'Playful pouting or annoyed expressions' },
  { key: 'surprised', label: 'Surprised / Wide Eyes', desc: 'Excitement, gasp, or shock' },
  { key: 'blushing', label: 'Flustered / Blushing', desc: 'Bashful compliments or romantic closeness' },
  { key: 'sleepy', label: 'Sleepy / Drowsy', desc: 'Late night cozy or tired conversations' },
];

export const AssetImporterModal: React.FC<AssetImporterModalProps> = ({
  character,
  isOpen,
  onClose,
  onSave,
}) => {
  const [assets, setAssets] = useState<CharacterExpressionAssets>(character.avatarAssets || {});

  if (!isOpen) return null;

  const handleFileUpload = (key: AvatarExpression, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAssets((prev) => ({
          ...prev,
          [key]: e.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClear = (key: AvatarExpression) => {
    setAssets((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = () => {
    onSave(assets);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl bg-[#121521] border border-sakura-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sakura-500/20 flex items-center justify-between bg-sakura-950/20">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-sakura-400" />
              Custom Expression Asset Manager
            </h2>
            <p className="text-xs text-slate-400">
              Customize sprite images (PNG, GIF, SVG, WebP) for each of {character.name}'s expressions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPRESSIONS.map((expr) => {
              const currentSrc = assets[expr.key];
              return (
                <div
                  key={expr.key}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-sakura-500/30 transition flex gap-4 items-center"
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                    {currentSrc ? (
                      <img src={currentSrc} alt={expr.label} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-600 font-mono text-center px-1">SVG Default</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white capitalize">{expr.label}</h4>
                    <p className="text-xs text-slate-400 truncate">{expr.desc}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="cursor-pointer text-xs px-2.5 py-1 rounded bg-sakura-600/30 text-sakura-300 hover:bg-sakura-600/50 transition flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        {currentSrc ? 'Replace' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(expr.key, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {currentSrc && (
                        <button
                          onClick={() => handleClear(expr.key)}
                          className="text-xs px-2 py-1 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-sakura-600/30 flex items-center gap-2 transition"
          >
            <Check className="w-4 h-4" />
            Save Expressions
          </button>
        </div>
      </div>
    </div>
  );
};
