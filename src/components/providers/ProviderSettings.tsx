import React, { useState } from 'react';
import { AIProviderConfig, ConnectionTestResult } from '../../types/provider';
import { testAIConnection } from '../../services/ai/connectionTester';
import {
  Server,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  RefreshCw,
  Sparkles,
  Radio,
} from 'lucide-react';

interface ProviderSettingsProps {
  providers: AIProviderConfig[];
  activeProviderId: string;
  onSaveProvider: (prov: AIProviderConfig) => void;
  onDeleteProvider: (id: string) => void;
  onSetActiveProvider: (id: string) => void;
}

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({
  providers,
  activeProviderId,
  onSaveProvider,
  onDeleteProvider,
  onSetActiveProvider,
}) => {
  const active = providers.find((p) => p.id === activeProviderId) || providers[0];
  const [selectedProv, setSelectedProv] = useState<AIProviderConfig>(active);

  // Form states
  const [name, setName] = useState(selectedProv.name);
  const [baseUrl, setBaseUrl] = useState(selectedProv.baseUrl);
  const [apiKey, setApiKey] = useState(selectedProv.apiKey || '');
  const [model, setModel] = useState(selectedProv.model);
  const [showApiKey, setShowApiKey] = useState(false);
  const [temperature, setTemperature] = useState(selectedProv.temperature ?? 0.8);
  const [topP, setTopP] = useState(selectedProv.topP ?? 0.95);
  const [maxTokens, setMaxTokens] = useState(selectedProv.maxTokens ?? 2048);
  const [contextWindow, setContextWindow] = useState(selectedProv.contextWindow ?? 16000);
  const [enableReasoning, setEnableReasoning] = useState(Boolean(selectedProv.enableReasoning));
  const [reasoningEffort, setReasoningEffort] = useState(selectedProv.reasoningEffort || 'medium');
  const [timeoutMs, setTimeoutMs] = useState(selectedProv.timeoutMs ?? 45000);
  const [retryCount, setRetryCount] = useState(selectedProv.retryCount ?? 2);
  const [fallbackProviderId, setFallbackProviderId] = useState(selectedProv.fallbackProviderId || '');
  const [headersJson, setHeadersJson] = useState(
    JSON.stringify(selectedProv.customHeaders || {}, null, 2)
  );

  // Testing status
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const selectProvider = (p: AIProviderConfig) => {
    setSelectedProv(p);
    setName(p.name);
    setBaseUrl(p.baseUrl);
    setApiKey(p.apiKey || '');
    setModel(p.model);
    setTemperature(p.temperature ?? 0.8);
    setTopP(p.topP ?? 0.95);
    setMaxTokens(p.maxTokens ?? 2048);
    setContextWindow(p.contextWindow ?? 16000);
    setEnableReasoning(Boolean(p.enableReasoning));
    setReasoningEffort(p.reasoningEffort || 'medium');
    setTimeoutMs(p.timeoutMs ?? 45000);
    setRetryCount(p.retryCount ?? 2);
    setFallbackProviderId(p.fallbackProviderId || '');
    setHeadersJson(JSON.stringify(p.customHeaders || {}, null, 2));
    setTestResult(null);
  };

  const handleSave = () => {
    let parsedHeaders = {};
    try {
      parsedHeaders = JSON.parse(headersJson);
    } catch {
      alert('Custom headers must be valid JSON');
      return;
    }

    const updated: AIProviderConfig = {
      ...selectedProv,
      name: name.trim() || 'Custom Provider',
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim() || 'default-model',
      customHeaders: parsedHeaders,
      temperature,
      topP,
      maxTokens,
      contextWindow,
      enableReasoning,
      reasoningEffort: reasoningEffort as any,
      timeoutMs,
      retryCount,
      fallbackProviderId: fallbackProviderId || undefined,
      isActive: selectedProv.id === activeProviderId,
    };

    onSaveProvider(updated);
    setSelectedProv(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    let parsedHeaders = {};
    try {
      parsedHeaders = JSON.parse(headersJson);
    } catch {}

    const provToTest: AIProviderConfig = {
      ...selectedProv,
      name,
      baseUrl,
      apiKey,
      model,
      customHeaders: parsedHeaders,
      timeoutMs,
    };

    setIsTesting(true);
    setTestResult(null);

    const result = await testAIConnection(provToTest);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleCreateNew = () => {
    const newProv: AIProviderConfig = {
      id: 'prov-' + Math.random().toString(36).substring(2, 9),
      name: 'Custom Endpoint',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      model: 'local-model',
      temperature: 0.8,
      topP: 0.95,
      maxTokens: 2048,
      contextWindow: 8192,
      enableReasoning: false,
      timeoutMs: 45000,
      retryCount: 2,
      isActive: false,
    };

    onSaveProvider(newProv);
    selectProvider(newProv);
  };

  const applyPreset = (preset: 'lmstudio' | 'ollama' | 'openai' | 'openrouter') => {
    if (preset === 'lmstudio') {
      setBaseUrl('http://localhost:1234/v1');
      setModel('local-model');
      setName('LM Studio (Local)');
    } else if (preset === 'ollama') {
      setBaseUrl('http://localhost:11434/v1');
      setModel('llama3.2');
      setName('Ollama (Local)');
    } else if (preset === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
      setModel('gpt-4o-mini');
      setName('OpenAI');
    } else if (preset === 'openrouter') {
      setBaseUrl('https://openrouter.ai/api/v1');
      setModel('anthropic/claude-3.5-haiku');
      setName('OpenRouter');
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0d0f1a] text-slate-100 overflow-hidden select-none">
      {/* Left Providers List */}
      <div className="w-72 border-r border-slate-800 bg-[#101222]/80 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-sakura-400" />
            <h2 className="text-base font-bold text-white">AI Endpoints</h2>
          </div>
          <button
            onClick={handleCreateNew}
            className="p-1.5 rounded-lg bg-sakura-600/30 text-sakura-300 hover:bg-sakura-600/50 transition"
            title="Add New Provider"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {providers.map((prov) => {
            const isSelected = prov.id === selectedProv.id;
            const isActive = prov.id === activeProviderId;

            return (
              <div
                key={prov.id}
                onClick={() => selectProvider(prov)}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-sakura-950/40 border-sakura-500/50 shadow-md'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200 truncate">{prov.name}</span>
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{prov.model}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Provider Configuration Form */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#131627]/60">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">{name}</h1>
            {selectedProv.id === activeProviderId ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Active Provider
              </span>
            ) : (
              <button
                onClick={() => onSetActiveProvider(selectedProv.id)}
                className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white transition"
              >
                Set as Active
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-1.5 transition"
            >
              <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            {providers.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`Delete provider "${selectedProv.name}"?`)) {
                    onDeleteProvider(selectedProv.id);
                  }
                }}
                className="p-1.5 rounded-xl bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
                title="Delete Provider"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-sakura-600/30 flex items-center gap-1.5 transition"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
              {isSaved ? 'Saved!' : 'Save Endpoint'}
            </button>
          </div>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={`px-6 py-3 border-b text-xs flex items-center justify-between transition ${
              testResult.success
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/80 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.latencyMs && (
              <span className="font-mono text-[11px] opacity-80">
                Latency: {testResult.latencyMs}ms
              </span>
            )}
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text max-w-4xl">
          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Endpoint Presets:</span>
            <button
              onClick={() => applyPreset('lmstudio')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
            >
              LM Studio (Local)
            </button>
            <button
              onClick={() => applyPreset('ollama')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
            >
              Ollama (Local)
            </button>
            <button
              onClick={() => applyPreset('openai')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
            >
              OpenAI
            </button>
            <button
              onClick={() => applyPreset('openrouter')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
            >
              OpenRouter
            </button>
          </div>

          {/* Section 1: Endpoint & Auth */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-sakura-300 border-b border-slate-800 pb-2">
              Endpoint & Authentication
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Provider Nickname</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sakura-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  API Base URL (OpenAI-compatible)
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="e.g. http://localhost:1234/v1 or https://api.openai.com/v1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-sakura-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model Name / Identifier</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gpt-4o-mini, llama-3.2, mistral-7b"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-sakura-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  API Key / Token (Leave empty for local offline models)
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-sakura-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Model Parameters */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-sakura-300 border-b border-slate-800 pb-2">
              Generation Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Temperature</span>
                  <span className="font-mono text-sakura-400 font-semibold">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-sakura-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Top-P</span>
                  <span className="font-mono text-sakura-400 font-semibold">{topP}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className="w-full accent-sakura-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Max Output Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Context Window Size</label>
                <input
                  type="number"
                  value={contextWindow}
                  onChange={(e) => setContextWindow(parseInt(e.target.value) || 16000)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
                />
              </div>
            </div>

            {/* Reasoning settings */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-200">
                  Enable Reasoning / Thinking Tags
                </label>
                <p className="text-[11px] text-slate-400">
                  Parses &lt;think&gt; blocks from DeepSeek-R1, o1, or reasoning models into a collapsible drawer.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableReasoning}
                onChange={(e) => setEnableReasoning(e.target.checked)}
                className="w-4 h-4 rounded text-sakura-500"
              />
            </div>
          </div>

          {/* Section 3: Reliability & Fallback */}
          <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-sakura-300 border-b border-slate-800 pb-2">
              Resilience, Retries & Fallback
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Request Timeout (ms)</label>
                <input
                  type="number"
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 45000)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Retry Attempts</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={retryCount}
                  onChange={(e) => setRetryCount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Fallback Provider</label>
                <select
                  value={fallbackProviderId}
                  onChange={(e) => setFallbackProviderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                >
                  <option value="">None (Fail immediately)</option>
                  {providers
                    .filter((p) => p.id !== selectedProv.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.model})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Custom HTTP Headers (JSON)
              </label>
              <textarea
                value={headersJson}
                onChange={(e) => setHeadersJson(e.target.value)}
                rows={3}
                placeholder='{ "HTTP-Referer": "https://example.com" }'
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
