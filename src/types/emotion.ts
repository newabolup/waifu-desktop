export interface EmotionalState {
  characterId: string;
  happiness: number;   // 0 - 100
  affection: number;   // 0 - 100
  excitement: number;  // 0 - 100
  sadness: number;     // 0 - 100
  anger: number;       // 0 - 100
  jealousy: number;    // 0 - 100
  energy: number;      // 0 - 100
  trust: number;       // 0 - 100
  familiarity: number; // 0 - 100
  intensity: number;   // 0.0 - 1.0 (simulation multiplier)
  isEnabled: boolean;
  lastUpdated: number;
}

export type DominantMood =
  | 'Radiant'
  | 'Affectionate'
  | 'Bashful'
  | 'Excited'
  | 'Pensive'
  | 'Melancholy'
  | 'Flustered'
  | 'Pouting'
  | 'Sleepy'
  | 'Serene';
