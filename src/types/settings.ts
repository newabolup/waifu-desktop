export type ThemePreset =
  | 'dark-sakura'
  | 'midnight-neon'
  | 'cyber-dream'
  | 'light-velvet';

export interface UserProfile {
  name: string;
  pronouns?: string;
  interests?: string[];
  notes?: string;
}

export interface AppSettings {
  theme: ThemePreset;
  soundEffects: boolean;
  petalParticles: boolean;
  userProfile: UserProfile;
  developerDebugMode: boolean;
  maskSensitiveKeys: boolean;
  memoryTokenBudget: number; // Max tokens allocated for memories in context
  autoExtractMemories: boolean;
  activeCharacterId: string;
  activeProviderId: string;
}
