export interface CharacterExpressionAssets {
  idle?: string;
  talking?: string;
  happy?: string;
  sad?: string;
  angry?: string;
  surprised?: string;
  blushing?: string;
  sleepy?: string;
}

export type AvatarExpression =
  | 'idle'
  | 'talking'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'blushing'
  | 'sleepy';

export interface CharacterProfile {
  id: string;
  name: string;
  ageLabel?: string;
  appearance: string;
  personality: string;
  backstory: string;
  speakingStyle: string;
  likes: string[];
  dislikes: string[];
  rules: string[];
  boundaries: string[];
  customRules: string[];
  avatarAssets: CharacterExpressionAssets;
  baselineHappiness: number;
  baselineAffection: number;
  baselineExcitement: number;
  baselineEnergy: number;
  baselineTrust: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
