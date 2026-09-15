import React, { useState, useEffect } from 'react';
import { TTSConfig } from '../../types/voice';
import { ttsService } from '../../services/voice/ttsService';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Check,
  Sparkles,
  Sliders,
  Settings,
} from 'lucide-react';

interface VoiceSettingsProps {
  ttsConfig: TTSConfig;
  characterName: string;
  onSaveTTSConfig: (config: TTSConfig) => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  ttsConfig,
  characterName,
  onSaveTTSConfig,
}) => {
  const [config, setConfig] = useState<TTSConfig>(ttsConfig);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    ttsService.getWebSpeechVoices().then((v) => {
      setSystemVoices(v);
      if (!config.voiceId && v.length > 0) {
        // Find a natural female or default voice
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
    const sampleText = `Hello Senpai! I am ${characterName}. It is wonderful to hear your voice, and I hope we can spend a lot of time together.`;
    await ttsService.speak(
      sampleText,
      config,
      () => setIsPlayingTest(true),
      () => setIsPlayingTest(false)
    );
  };

  const handleSave = () => {
    onSaveTTSConfig(config);
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
              Voice & Audio Studio
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Text-To-Speech Synthesis</h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Configure {characterName}'s vocal performance using zero-setup offline Windows voices,
            OpenAI neural voices, or custom audio streaming endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestSpeech}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sakura-500/40 text-xs text-sakura-300 flex items-center gap-1.5 transition shadow"
          >
            {isPlayingTest ? <Square className="w-3.5 h-3.5 fill-sakura-400" /> : <Play className="w-3.5 h-3.5 fill-sakura-400" />}
            {isPlayingTest ? 'Stop Voice' : 'Test Voice Playback'}
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

      {/* Main Settings Card */}
      <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-6 max-w-4xl select-text">
        {/* Engine Selection */}
        <div>
          <label className="block text-xs font-bold text-white mb-2">TTS Engine</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { key: 'webspeech', label: 'Built-in Windows Web Speech', desc: '100% Offline, uses Windows system voices with zero latency' },
              { key: 'openai', label: 'OpenAI Audio Speech', desc: 'High fidelity neural models (nova, shimmer, alloy)' },
              { key: 'custom_http', label: 'Custom HTTP Endpoint', desc: 'ElevenLabs, Kokoro TTS, or custom local audio server' },
            ].map((engine) => (
              <button
                key={engine.key}
                onClick={() => setConfig({ ...config, engine: engine.key as any })}
                className={`p-3 rounded-xl border text-left transition ${
                  config.engine === engine.key
                    ? 'bg-sakura-950/40 border-sakura-500/50 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold text-slate-200 block mb-1">{engine.label}</span>
                <span className="text-[11px] text-slate-400">{engine.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Speak Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-200 block">
              Auto-Speak Incoming Messages
            </span>
            <span className="text-[11px] text-slate-400">
              Automatically read aloud {characterName}'s responses when they arrive in the chat.
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.autoSpeak}
            onChange={(e) => setConfig({ ...config, autoSpeak: e.target.checked })}
            className="w-4 h-4 rounded text-sakura-500"
          />
        </div>

        {/* Engine-specific parameters */}
        {config.engine === 'webspeech' && (
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Select Installed Windows Voice
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
    </div>
  );
};
