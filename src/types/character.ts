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

export type AvatarModelType = 'svg' | '2d_model' | 'vrm';

export interface VrmModelMetadata {
  title?: string;
  author?: string;
  version?: string;
  contactInformation?: string;
  reference?: string;
}

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
  // 2D & VRM Model attributes
  modelType?: AvatarModelType;
  model2dUrl?: string; // 2D Model image data URL or file path
  vrmModelUrl?: string; // VRM 3D model data URL or file path
  vrmMetadata?: VrmModelMetadata;
  baselineHappiness: number;
  baselineAffection: number;
  baselineExcitement: number;
  baselineEnergy: number;
  baselineTrust: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
