import React, { useState } from 'react';
import { CharacterProfile, AvatarExpression, CharacterExpressionAssets, AvatarModelType } from '../../types/character';
import { VrmAvatarViewer } from './VrmAvatarViewer';
import { vrmStorage } from '../../services/storage/vrmStorage';
import { X, Upload, Check, Image as ImageIcon, Box, Sparkles, Trash2, Layers, Info, Save, Loader2 } from 'lucide-react';

interface AssetImporterModalProps {
  character: CharacterProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<CharacterProfile>) => void;
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
  const [activeTab, setActiveTab] = useState<'2d' | 'vrm' | 'expressions'>('2d');
  const [modelType, setModelType] = useState<AvatarModelType>(character.modelType || 'svg');
  const [model2dUrl, setModel2dUrl] = useState<string>(character.model2dUrl || '');
  const [vrmModelUrl, setVrmModelUrl] = useState<string>(character.vrmModelUrl || '');
  const [assets, setAssets] = useState<CharacterExpressionAssets>(character.avatarAssets || {});
  const [vrmName, setVrmName] = useState<string>(character.vrmMetadata?.title || '');
  const [vrmAuthor, setVrmAuthor] = useState<string>(character.vrmMetadata?.author || '');

  const [rawVrmFile, setRawVrmFile] = useState<File | null>(null);
  const [isSavingVrm, setIsSavingVrm] = useState(false);
  const [vrmSaveMessage, setVrmSaveMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle 2D model full image upload
  const handle2dUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setModel2dUrl(e.target.result as string);
        setModelType('2d_model');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle VRM file upload
  const handleVrmUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.vrm')) {
      alert('لطفاً یک فایل با پسوند .vrm انتخاب کنید.');
      return;
    }
    setRawVrmFile(file);
    const blobUrl = URL.createObjectURL(file);
    setVrmModelUrl(blobUrl);
    setModelType('vrm');
    setVrmName(file.name.replace(/\.vrm$/i, ''));
    setVrmSaveMessage(null);
  };

  const handleSaveVrmToStorage = async () => {
    if (!rawVrmFile && !vrmModelUrl) return;
    setIsSavingVrm(true);
    try {
      if (rawVrmFile) {
        const liveUrl = await vrmStorage.saveVRM(character.id, rawVrmFile);
        setVrmModelUrl(liveUrl);
      }
      setVrmSaveMessage('مدل VRM با موفقیت در حافظه دائمی برنامه ذخیره شد!');
      setTimeout(() => setVrmSaveMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save VRM:', err);
      setVrmSaveMessage('خطا در ذخیره مدل VRM: ' + (err.message || 'نامشخص'));
    } finally {
      setIsSavingVrm(false);
    }
  };

  // Handle expression sprite upload
  const handleExpressionUpload = (key: AvatarExpression, file: File) => {
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

  const handleClearExpression = (key: AvatarExpression) => {
    setAssets((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    let finalVrmUrl = vrmModelUrl;
    if (rawVrmFile) {
      try {
        finalVrmUrl = await vrmStorage.saveVRM(character.id, rawVrmFile);
      } catch (e) {
        console.warn('Auto-save VRM failed in handleSave:', e);
      }
    }
    onSave({
      modelType,
      model2dUrl,
      vrmModelUrl: finalVrmUrl,
      avatarAssets: assets,
      vrmMetadata: finalVrmUrl
        ? {
            title: vrmName,
            author: vrmAuthor,
          }
        : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-4xl bg-[#121524] border border-sakura-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sakura-400" />
              مدیریت و آپلود مدل آواتار (2D Model & 3D VRM)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              آپلود و انتخاب مدل شخصیت بین مدل ۲ بعدی، مدل سه‌بعدی متحرک VRM یا انیمیشن SVG
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0d0f1b] px-6">
          <button
            onClick={() => setActiveTab('2d')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === '2d'
                ? 'border-sakura-500 text-sakura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            آپلود مدل ۲ بعدی (2D Model)
          </button>

          <button
            onClick={() => setActiveTab('vrm')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'vrm'
                ? 'border-sakura-500 text-sakura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-4 h-4 text-purple-400" />
            آپلود مدل سه‌بعدی VRM (3D Avatar)
          </button>

          <button
            onClick={() => setActiveTab('expressions')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'expressions'
                ? 'border-sakura-500 text-sakura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            اسپرایت‌های حالات چهره (Expressions)
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Model Indicator */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">حالت فعال آواتار در بازی:</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sakura-500/20 text-sakura-300 font-mono">
                {modelType === 'vrm'
                  ? '3D VRM Model'
                  : modelType === '2d_model'
                  ? '2D Custom Model'
                  : 'Built-in SVG Anime'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setModelType('2d_model')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  modelType === '2d_model'
                    ? 'bg-sakura-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                فعال‌سازی 2D
              </button>
              <button
                onClick={() => setModelType('vrm')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  modelType === 'vrm'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                فعال‌سازی VRM
              </button>
              <button
                onClick={() => setModelType('svg')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  modelType === 'svg'
                    ? 'bg-sakura-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                SVG پیش‌فرض
              </button>
            </div>
          </div>

          {/* Tab 1: 2D Model Upload */}
          {activeTab === '2d' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Upload Control */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">آپلود مدل ۲ بعدی شخصیت</h3>
                    <p className="text-xs text-slate-400">
                      تصویر تمام‌قد یا پرتره مدل ۲ بعدی را آپلود کنید (PNG بدون پس‌زمینه، WebP، GIF، SVG).
                    </p>
                  </div>

                  <label className="border-2 border-dashed border-slate-700 hover:border-sakura-500/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-900/30">
                    <Upload className="w-8 h-8 text-sakura-400" />
                    <span className="text-xs font-bold text-slate-200">انتخاب یا درگ تصویر مدل ۲ بعدی</span>
                    <span className="text-[10px] text-slate-500 font-mono">PNG, WEBP, GIF, SVG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handle2dUpload(file);
                      }}
                    />
                  </label>

                  {model2dUrl && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                        <Check className="w-3.5 h-3.5" /> مدل ۲ بعدی بارگذاری شد
                      </span>
                      <button
                        onClick={() => {
                          setModel2dUrl('');
                          if (modelType === '2d_model') setModelType('svg');
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        حذف مدل
                      </button>
                    </div>
                  )}
                </div>

                {/* 2D Model Preview */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center min-h-[280px]">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">پیش‌نمایش مدل ۲ بعدی</h4>
                  {model2dUrl ? (
                    <div className="relative w-56 h-64 flex items-center justify-center overflow-hidden rounded-2xl bg-[#0d0f1b] border border-slate-800">
                      <img
                        src={model2dUrl}
                        alt="2D Model Preview"
                        className="w-full h-full object-contain filter drop-shadow-xl"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-slate-600 text-xs">
                      هنوز مدلی آپلود نشده است.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: VRM 3D Model Upload */}
          {activeTab === 'vrm' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Upload Control */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">آپلود مدل سه‌بعدی VRM</h3>
                    <p className="text-xs text-slate-400">
                      فایل استاندارد <code>.vrm</code> کاراکتر را انتخاب کنید (پشتیبانی از VRM 0.0 و VRM 1.0 شامل انیمیشن پلک، حرکت دهان و احساسات).
                    </p>
                  </div>

                  <label className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/70 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-purple-950/10">
                    <Box className="w-8 h-8 text-purple-400" />
                    <span className="text-xs font-bold text-purple-200">انتخاب یا درگ فایل مدل .vrm</span>
                    <span className="text-[10px] text-slate-500 font-mono">فرمت رسمی استاندارد VRM</span>
                    <input
                      type="file"
                      accept=".vrm"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVrmUpload(file);
                      }}
                    />
                  </label>

                  {vrmModelUrl && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-white">{vrmName || 'VRM Avatar'}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">آماده رندر</span>
                        </div>
                        <input
                          type="text"
                          value={vrmAuthor}
                          onChange={(e) => setVrmAuthor(e.target.value)}
                          placeholder="نام سازنده / Author (اختیاری)"
                          className="w-full mt-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-slate-200"
                        />
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveVrmToStorage}
                          disabled={isSavingVrm}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition"
                        >
                          {isSavingVrm ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 text-purple-200" />
                          )}
                          <span>ذخیره دائمی مدل VRM در حافظه برنامه</span>
                        </button>

                        {vrmSaveMessage && (
                          <div className={`p-2 rounded-lg text-[11px] text-center font-medium ${
                            vrmSaveMessage.includes('خطا')
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                          }`}>
                            {vrmSaveMessage}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            await vrmStorage.deleteVRM(character.id);
                            setVrmModelUrl('');
                            setRawVrmFile(null);
                            if (modelType === 'vrm') setModelType('svg');
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 py-1"
                        >
                          حذف مدل VRM
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D Interactive Preview */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center min-h-[320px]">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">پیش‌نمایش تعاملی سه‌بعدی</h4>
                  {vrmModelUrl ? (
                    <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-[#0a0c16] border border-purple-500/20">
                      <VrmAvatarViewer
                        vrmUrl={vrmModelUrl}
                        expression="happy"
                        isTalking={false}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-slate-600 text-xs flex flex-col items-center gap-2">
                      <Box className="w-10 h-10 text-slate-700 stroke-1" />
                      <span>فایل .vrm را آپلود کنید تا مدل سه‌بعدی مستقیماً در این کادر اجرا شود.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Custom Expression Sprites */}
          {activeTab === 'expressions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXPRESSIONS.map((expr) => {
                const currentSrc = assets[expr.key];
                return (
                  <div
                    key={expr.key}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-sakura-500/30 transition flex gap-3 items-center"
                  >
                    <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {currentSrc ? (
                        <img src={currentSrc} alt={expr.label} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-slate-600 font-mono text-center">Default</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white">{expr.label}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{expr.desc}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-sakura-600 text-slate-300 hover:text-white cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleExpressionUpload(expr.key, file);
                          }}
                        />
                      </label>
                      {currentSrc && (
                        <button
                          onClick={() => handleClearExpression(expr.key)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sakura-400" />
            <span>تنظیمات و مدل انتخابی به صورت پایدار برای این کاراکتر ذخیره می‌شود.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-sakura-600/30 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              ذخیره مدل آواتار
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
