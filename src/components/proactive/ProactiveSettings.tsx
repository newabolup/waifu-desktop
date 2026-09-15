import React, { useState } from 'react';
import { ProactiveRule } from '../../types/proactive';
import { CharacterProfile } from '../../types/character';
import { proactiveScheduler } from '../../services/proactive/proactiveScheduler';
import {
  Bell,
  Sun,
  Moon,
  Clock,
  Shuffle,
  Shield,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';

interface ProactiveSettingsProps {
  rules: ProactiveRule[];
  character: CharacterProfile;
  onSaveRule: (rule: ProactiveRule) => void;
}

export const ProactiveSettings: React.FC<ProactiveSettingsProps> = ({
  rules,
  character,
  onSaveRule,
}) => {
  const [localRules, setLocalRules] = useState<ProactiveRule[]>(rules);
  const [testFiring, setTestFiring] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const updateRule = (ruleId: string, updates: Partial<ProactiveRule>) => {
    setLocalRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          const next = { ...r, ...updates };
          onSaveRule(next);
          return next;
        }
        return r;
      })
    );
  };

  const handleTestTrigger = async (rule: ProactiveRule) => {
    setTestFiring(true);
    setTestMessage('');
    try {
      const msg = await proactiveScheduler.fireProactiveRule(rule, character);
      setTestMessage(msg);
    } catch (err: any) {
      setTestMessage(`Failed to trigger: ${err.message}`);
    }
    setTestFiring(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'morning_greeting':
        return Sun;
      case 'evening_greeting':
        return Moon;
      case 'inactivity':
        return Clock;
      default:
        return Shuffle;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f1a] text-slate-100 overflow-y-auto p-6 select-none space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#131627] via-[#101222] to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-sakura-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-sakura-300">
              Proactive Initiative Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Autonomous Check-ins & Reminders</h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Allow {character.name} to initiate conversations, send morning greetings, or check in when
            you have been away, guarded by quiet hours and anti-spam cooldowns.
          </p>
        </div>
      </div>

      {/* Test Message Result Banner */}
      {testMessage && (
        <div className="p-4 rounded-2xl bg-sakura-950/40 border border-sakura-500/30 text-xs text-slate-200 flex items-center justify-between">
          <div>
            <span className="font-bold text-sakura-400 block mb-0.5">
              Proactive Message Generated & Sent to Chat:
            </span>
            <span className="italic">"{testMessage}"</span>
          </div>
          <button onClick={() => setTestMessage('')} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text">
        {localRules.map((rule) => {
          const Icon = getIcon(rule.type);

          return (
            <div
              key={rule.id}
              className="p-5 rounded-2xl bg-[#141728]/70 border border-slate-800 flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header with toggle */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sakura-950/60 border border-sakura-500/30 flex items-center justify-center text-sakura-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{rule.title}</h3>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {rule.type}
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={rule.isEnabled}
                    onChange={(e) => updateRule(rule.id, { isEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-sakura-500"
                  />
                </div>

                {/* Specific trigger params */}
                {rule.type === 'inactivity' && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Inactivity Trigger (Hours of user silence)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={rule.inactivityHours || 18}
                      onChange={(e) =>
                        updateRule(rule.id, { inactivityHours: parseFloat(e.target.value) || 18 })
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                )}

                {rule.type === 'morning_greeting' && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Window Start
                      </label>
                      <input
                        type="time"
                        value={rule.morningStart || '08:00'}
                        onChange={(e) => updateRule(rule.id, { morningStart: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Window End
                      </label>
                      <input
                        type="time"
                        value={rule.morningEnd || '10:30'}
                        onChange={(e) => updateRule(rule.id, { morningEnd: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {rule.type === 'evening_greeting' && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Window Start
                      </label>
                      <input
                        type="time"
                        value={rule.eveningStart || '20:30'}
                        onChange={(e) => updateRule(rule.id, { eveningStart: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Window End
                      </label>
                      <input
                        type="time"
                        value={rule.eveningEnd || '23:00'}
                        onChange={(e) => updateRule(rule.id, { eveningEnd: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Common Protection params: Quiet hours and cooldown */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Quiet Hours Start (Sleep)
                    </label>
                    <input
                      type="time"
                      value={rule.quietHoursStart || '23:00'}
                      onChange={(e) => updateRule(rule.id, { quietHoursStart: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Quiet Hours End (Wake)
                    </label>
                    <input
                      type="time"
                      value={rule.quietHoursEnd || '08:00'}
                      onChange={(e) => updateRule(rule.id, { quietHoursEnd: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Cooldown Hours (Minimum delay before re-triggering)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={rule.cooldownHours || 6}
                    onChange={(e) =>
                      updateRule(rule.id, { cooldownHours: parseFloat(e.target.value) || 6 })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Prompt Guidance
                  </label>
                  <textarea
                    value={rule.promptGuidance}
                    onChange={(e) => updateRule(rule.id, { promptGuidance: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[11px] text-slate-500">
                  {rule.lastTriggeredAt
                    ? `Last sent: ${new Date(rule.lastTriggeredAt).toLocaleString([], {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Not yet triggered'}
                </span>
                <button
                  onClick={() => handleTestTrigger(rule)}
                  disabled={testFiring}
                  className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-sakura-500/40 text-xs text-sakura-300 flex items-center gap-1.5 transition"
                >
                  <Zap className="w-3 h-3" />
                  {testFiring ? 'Triggering...' : 'Test Trigger'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
