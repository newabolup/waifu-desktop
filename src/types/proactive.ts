export type ProactiveTriggerType =
  | 'inactivity'
  | 'morning_greeting'
  | 'evening_greeting'
  | 'random_checkin'
  | 'follow_up';

export interface ProactiveRule {
  id: string;
  characterId: string;
  type: ProactiveTriggerType;
  title: string;
  isEnabled: boolean;
  promptGuidance: string; // Instructions for how the AI should compose the proactive text
  inactivityHours?: number; // For inactivity trigger
  morningStart?: string; // "08:00"
  morningEnd?: string; // "10:00"
  eveningStart?: string; // "21:00"
  eveningEnd?: string; // "23:00"
  quietHoursStart?: string; // "23:00"
  quietHoursEnd?: string; // "08:00"
  cooldownHours: number; // Minimum hours between proactive messages
  lastTriggeredAt?: number;
}
