export interface RelationshipStage {
  id: string;
  name: string;
  minPoints: number;
  description: string;
  promptModifier: string; // Instructions injected into prompt for this stage
  unlockedFeatures?: string[];
}

export interface RelationshipMilestone {
  id: string;
  stageName: string;
  eventDescription: string;
  timestamp: number;
}

export interface RelationshipProgress {
  characterId: string;
  affinityPoints: number;
  currentStageId: string;
  stages: RelationshipStage[];
  milestones: RelationshipMilestone[];
  updatedAt: number;
}
