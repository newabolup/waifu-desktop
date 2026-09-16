import React, { useState, useEffect } from 'react';
import { TTSConfig, STTConfig } from '../../types/voice';
import { ttsService } from '../../services/voice/ttsService';
import { DEFAULT_STT_CONFIG } from '../../services/storage/defaults';
import {
  Volume2,
  Mic,
  Play,
  Square,
  Check,
  Sparkles,
  Sliders,
  Settings,
  Key,
  Radio,
  Globe,
} from 'lucide-react';

interface VoiceSettingsProps {
  ttsConfig: TTSConfig;
  sttConfig?: STTConfig;
  characterName: string;
  onSaveTTSConfig: (config: TTSConfig) => void;
  onSaveSTTConfig?: (config: STTConfig) => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  ttsConfig,
  sttConfig = DEFAULT_STT_CONFIG,
  characterName,
  onSaveTTSConfig,
  onSaveSTTConfig,
}) => {
  const [config, setConfig] = useState<TTSConfig>(ttsConfig);
  const [stt, setStt] = useState<STTConfig>(sttConfig);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    ttsService.getWebSpeechVoices().then((v) => {
      setSystemVoices(v);
      if (!config.voiceId && v.length > 0) {
        const pref = v.find((voice) => /zira|female|natural|ayumi|haruka/i.test(voice.name)) || v[0];
        if (pref) {
          setConfig((prev) => ({ ...prev, voiceId: pref.voiceURI || pref.name }));
        }
      }
    });
  }, []);

  const handleTestSpeech = async () => {
    if (isPlayingTest) {
      ttsService.stop();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    const sampleText = `سلام! من ${characterName} هستم. خوشحالم که صدای من رو می‌شنوی.`;
    try {
      await ttsService.speak(
        sampleText,
        config,
        () => setIsPlayingTest(true),
        () => setIsPlayingTest(false)
      );
    } catch {
      setIsPlayingTest(false);
    }
  };

  const handleSave = () => {
    onSaveTTSConfig(config);
    onSaveSTTConfig?.(stt);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f1a] text-slate-100 overflow-y-auto p-6 select-none space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#131627] via-[#101222] to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-5 h-5 text-sakura-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-sakura-300">
              Voice & Speech Studio
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">TTS & STT Voice Settings</h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Configure {characterName}&apos;s vocal performance with Fish Audio, Web Speech, or OpenAI,
            and set up speech-to-text voice input.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestSpeech}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sakura-500/40 text-xs text-sakura-300 flex items-center gap-1.5 transition shadow"
          >
            {isPlayingTest ? <Square className="w-3.5 h-3.5 fill-sakura-400" /> : <Play className="w-3.5 h-3.5 fill-sakura-400" />}
            {isPlayingTest ? 'Stop Voice' : 'Test Playback'}
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-sakura-600/30 flex items-center gap-1.5 transition"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
            {isSaved ? 'Saved!' : 'Save Voice Config'}
          </button>
        </div>
      </div>

      {/* TTS Section */}
      <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-6 max-w-4xl select-text">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Volume2 className="w-4 h-4 text-sakura-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Text-To-Speech Engine (TTS)</h2>
        </div>

        {/* Engine Selection */}
        <div>
          <label className="block text-xs font-bold text-white mb-2">Select TTS Engine</label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              {
                key: 'fish_audio',
                label: 'Fish Audio',
                badge: 'Recommended',
                desc: 'Next-gen voice cloning with API key & Model ID (reference_id)',
              },
              {
                key: 'webspeech',
                label: 'Built-in Web Speech',
                badge: 'Offline',
                desc: 'Uses OS system voices with zero network latency',
              },
              {
                key: 'openai',
                label: 'OpenAI Audio',
                badge: 'Cloud',
                desc: 'Neural models (nova, shimmer, alloy)',
              },
              {
                key: 'custom_http',
                label: 'Custom HTTP',
                badge: 'API',
                desc: 'Custom local or remote audio server',
              },
            ].map((engine) => (
              <button
                key={engine.key}
                onClick={() => setConfig({ ...config, engine: engine.key as any })}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  config.engine === engine.key
                    ? 'bg-sakura-950/40 border-sakura-500/60 shadow-md shadow-sakura-500/10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-100">{engine.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sakura-500/20 text-sakura-300 font-mono">
                      {engine.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-tight block">{engine.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Speak Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-200 block">
              Auto-Speak Incoming Messages
            </span>
            <span className="text-[11px] text-slate-400">
              Automatically read aloud {characterName}&apos;s responses when they arrive in the chat.
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.autoSpeak}
            onChange={(e) => setConfig({ ...config, autoSpeak: e.target.checked })}
            className="w-4 h-4 rounded text-sakura-500 cursor-pointer"
          />
        </div>

        {/* Fish Audio Specific Settings */}
        {config.engine === 'fish_audio' && (
          <div className="space-y-4 p-4 rounded-xl bg-slate-950/50 border border-sakura-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-sakura-300">
              <Key className="w-3.5 h-3.5" />
              <span>Fish Audio Configuration</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Fish Audio API Key <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                value={config.fishAudioApiKey || ''}
                onChange={(e) => setConfig({ ...config, fishAudioApiKey: e.target.value })}
                placeholder="Enter your Fish Audio API Key..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:border-sakura-500/50 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Get your API key from <a href="https://fish.audio" target="_blank" rel="noreferrer" className="text-sakura-400 underline">fish.audio</a> developer dashboard.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Fish Audio Model
              </label>
              <select
                value={config.fishAudioModel || 's2.1-pro-free'}
                onChange={(e) => setConfig({ ...config, fishAudioModel: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
              >
                <option value="s2.1-pro-free">S2.1 Pro Free (رایگان نامحدود - Official Free API)</option>
                <option value="s2.1-pro">S2.1 Pro (Premium High Throughput)</option>
                <option value="s2-pro">S2 Pro (Legacy Model)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                مدل رسمی رایگان S2.1 Pro Free بدون هزینه و با کیفیت بالا از ۸۳ زبان پشتیبانی می‌کند.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Fish Audio Model ID / Voice Reference ID (reference_id)
              </label>
              <input
                type="text"
                value={config.fishAudioModelId || ''}
                onChange={(e) => setConfig({ ...config, fishAudioModelId: e.target.value })}
                placeholder="e.g. 7f92f8afb8ec43bf81429cc1c9199cb1"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:border-sakura-500/50 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                The ID of the custom cloned voice or public model on fish.audio.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Fish Audio Endpoint (Optional)
              </label>
              <input
                type="text"
                value={config.fishAudioEndpoint || 'https://api.fish.audio/v1/tts'}
                onChange={(e) => setConfig({ ...config, fishAudioEndpoint: e.target.value })}
                placeholder="https://api.fish.audio/v1/tts"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:border-sakura-500/50 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* WebSpeech specific */}
        {config.engine === 'webspeech' && (
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Select Installed Windows / System Voice
            </label>
            <select
              value={config.voiceId}
              onChange={(e) => setConfig({ ...config, voiceId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
            >
              {systemVoices.map((v) => (
                <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* OpenAI specific */}
        {config.engine === 'openai' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">OpenAI API Key</label>
              <input
                type="password"
                value={config.openaiApiKey || ''}
                onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">Voice Character</label>
              <select
                value={config.openaiVoice || 'nova'}
                onChange={(e) => setConfig({ ...config, openaiVoice: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              >
                {['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx'].map((v) => (
                  <option key={v} value={v}>
                    {v.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Custom HTTP specific */}
        {config.engine === 'custom_http' && (
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Custom TTS Audio Endpoint
            </label>
            <input
              type="text"
              value={config.customEndpoint || ''}
              onChange={(e) => setConfig({ ...config, customEndpoint: e.target.value })}
              placeholder="http://localhost:8000/v1/audio/speech"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
            />
          </div>
        )}

        {/* Speed & Pitch Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-800">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-200">Speech Speed / Rate</span>
              <span className="font-mono text-sakura-400 font-bold">{config.speed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={config.speed}
              onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
              className="w-full accent-sakura-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-200">Voice Pitch</span>
              <span className="font-mono text-sakura-400 font-bold">{config.pitch}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={config.pitch}
              onChange={(e) => setConfig({ ...config, pitch: parseFloat(e.target.value) })}
              className="w-full accent-sakura-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* STT Section */}
      <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-6 max-w-4xl select-text">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Mic className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Speech-To-Text Voice Input (STT)</h2>
        </div>

        <div>
          <label className="block text-xs font-bold text-white mb-2">STT Engine</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                key: 'microphone',
                label: 'Direct Microphone (Fish Audio / Whisper)',
                badge: 'Recommended',
                desc: 'ضبط مستقیم از میکروفن و تبدیل با هوش مصنوعی صوتی Fish Audio یا Whisper',
              },
              {
                key: 'fish_audio_asr',
                label: 'Fish Audio Transcribe (ASR)',
                badge: 'Fish Audio',
                desc: 'تبدیل دقیق گفتار فارسی به متن با استفاده از مدل Transcribe هوش مصنوعی Fish Audio',
              },
              {
                key: 'whisper_openai',
                label: 'OpenAI Whisper API',
                badge: 'Whisper',
                desc: 'تبدیل صوت از طریق سرورهای مدل OpenAI Whisper',
              },
            ].map((engine) => (
              <button
                key={engine.key}
                onClick={() => setStt({ ...stt, engine: engine.key as any })}
                className={`p-3 rounded-xl border text-left transition ${
                  (stt.engine || 'microphone') === engine.key
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-100">{engine.label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    {engine.badge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 leading-tight block">{engine.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              Recognition Language
            </label>
            <select
              value={stt.language || 'fa'}
              onChange={(e) => setStt({ ...stt, language: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
            >
              <option value="fa">فارسی / Persian (fa)</option>
              <option value="en">English (en)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="auto">Auto-detect</option>
            </select>
          </div>

          {(stt.engine === 'fish_audio_asr' || stt.engine === 'microphone') && (
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Fish Audio API Key (ASR)
              </label>
              <input
                type="password"
                value={stt.fishAudioApiKey || ''}
                onChange={(e) => setStt({ ...stt, fishAudioApiKey: e.target.value })}
                placeholder="به‌طور خودکار از کلید TTS استفاده می‌شود (یا کلید جداگانه وارد کنید)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          )}

          {stt.engine === 'whisper_openai' && (
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Whisper API Key
              </label>
              <input
                type="password"
                value={stt.openaiApiKey || ''}
                onChange={(e) => setStt({ ...stt, openaiApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
