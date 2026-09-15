import React, { useState } from 'react';
import { AIProviderConfig } from '../../types/provider';
import { MemoryItem } from '../../types/memory';
import {
  Terminal,
  Activity,
  Cpu,
  Brain,
  FileText,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface DebugPanelProps {
  activeProvider: AIProviderConfig;
  lastLatencyMs?: number;
  lastTokensUsed?: number;
  lastRetrievedMemories: MemoryItem[];
  lastAssembledPrompt: string;
  maskSensitiveKeys: boolean;
  onToggleMaskKeys: (mask: boolean) => void;
  errorLog: string[];
  onClearErrors: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  activeProvider,
  lastLatencyMs = 0,
  lastTokensUsed = 0,
  lastRetrievedMemories,
  lastAssembledPrompt,
  maskSensitiveKeys,
  onToggleMaskKeys,
  errorLog,
  onClearErrors,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const maskKey = (key?: string) => {
    if (!key) return '(None / Local)';
    if (!maskSensitiveKeys) return key;
    if (key.length <= 8) return '********';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(lastAssembledPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f1a] text-slate-100 overflow-y-auto p-6 select-none space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#131627] via-[#101222] to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-sakura-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-sakura-300">
              Developer Diagnostics & Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Debug & Inspection Suite</h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Inspect real-time token counts, request latency, injected memories, raw context payloads,
            and error diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleMaskKeys(!maskSensitiveKeys)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition"
          >
            {maskSensitiveKeys ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
            {maskSensitiveKeys ? 'Keys Masked' : 'Keys Visible'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-text">
        <div className="p-4 rounded-2xl bg-[#141728]/70 border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Active Endpoint</span>
          <span className="text-sm font-bold text-white font-mono block truncate">
            {activeProvider.name}
          </span>
          <span className="text-[10px] text-slate-500 font-mono truncate block">
            {activeProvider.baseUrl}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141728]/70 border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Active Model</span>
          <span className="text-sm font-bold text-sakura-400 font-mono block truncate">
            {activeProvider.model}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            API Key: {maskKey(activeProvider.apiKey)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141728]/70 border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Last Turn Latency</span>
          <span className="text-sm font-bold text-cyan-400 font-mono block">
            {lastLatencyMs > 0 ? `${lastLatencyMs}ms` : 'Idle / Ready'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Timeout: {activeProvider.timeoutMs}ms
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141728]/70 border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">
            Retrieved Memories Count
          </span>
          <span className="text-sm font-bold text-purple-400 font-mono block">
            {lastRetrievedMemories.length} memories
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Context window: {activeProvider.contextWindow} tok
          </span>
        </div>
      </div>

      {/* Retrieved Memories for latest turn */}
      <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-3 select-text">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <Brain className="w-4 h-4 text-purple-400" />
          Retrieved Memories Injected into Latest Context
        </h3>
        {lastRetrievedMemories.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            No memories were injected for the current query.
          </p>
        ) : (
          <div className="space-y-2">
            {lastRetrievedMemories.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sakura-400 uppercase">
                    {m.category}
                  </span>
                  <span className="text-slate-200">{m.content}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  conf: {(m.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Assembled Prompt Viewer */}
      <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-3 select-text">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-sakura-400" />
            Live Assembled System Prompt & Context
          </h3>
          <button
            onClick={handleCopyPrompt}
            className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-200 flex items-center gap-1.5 transition"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPrompt ? 'Copied' : 'Copy Full Prompt'}
          </button>
        </div>
        <div className="p-4 rounded-xl bg-black/70 border border-slate-900 text-slate-300 font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
          {lastAssembledPrompt || '(Prompt will compile on initial message exchange)'}
        </div>
      </div>

      {/* Error Logs */}
      <div className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 space-y-3 select-text">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Recent Error Diagnostics ({errorLog.length})
          </h3>
          {errorLog.length > 0 && (
            <button
              onClick={onClearErrors}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Clear Logs
            </button>
          )}
        </div>
        {errorLog.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No errors logged. All systems nominal.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
            {errorLog.map((err, i) => (
              <div key={i} className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300">
                {err}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
