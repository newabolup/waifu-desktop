import { RelationshipProgress, RelationshipStage, RelationshipMilestone } from '../../types/relationship';
import { StorageService } from '../storage/db';

export class RelationshipEngine {
  private storage = StorageService.getInstance();

  /**
   * Adds affinity points and evaluates stage progression.
   * Returns newly unlocked milestone if a stage transition occurred.
   */
  public async addAffinity(
    characterId: string,
    points: number,
    reason?: string
  ): Promise<{ progress: RelationshipProgress; newMilestone?: RelationshipMilestone }> {
    const progress = await this.storage.getRelationshipProgress(characterId);
    progress.affinityPoints = Math.max(0, progress.affinityPoints + points);

    // Evaluate stages ordered by minPoints ascending
    const sortedStages = [...progress.stages].sort((a, b) => a.minPoints - b.minPoints);
    let targetStage = sortedStages[0];

    for (const stage of sortedStages) {
      if (progress.affinityPoints >= stage.minPoints) {
        targetStage = stage;
      } else {
        break;
      }
    }

    let newMilestone: RelationshipMilestone | undefined = undefined;

    if (targetStage.id !== progress.currentStageId) {
      // Stage advanced!
      const previousStage = sortedStages.find((s) => s.id === progress.currentStageId);
      progress.currentStageId = targetStage.id;

      newMilestone = {
        id: 'ms-' + Math.random().toString(36).substring(2, 9),
        stageName: targetStage.name,
        eventDescription: reason || `Advanced from ${previousStage?.name || 'Previous'} to ${targetStage.name}!`,
        timestamp: Date.now(),
      };

      progress.milestones.push(newMilestone);
    }

    progress.updatedAt = Date.now();
    await this.storage.saveRelationshipProgress(progress);

    return { progress, newMilestone };
  }

  /**
   * Analyzes an exchange to determine affinity earned.
   */
  public calculateAffinityGain(userMessage: string, assistantReply: string): number {
    const uLower = userMessage.toLowerCase();
    let pts = 2; // Base per turn

    if (userMessage.length > 80) {
      pts += 2; // Thoughtful long message
    }

    if (/(?:thank you|appreciate|grateful|you're sweet|love you|best girl|special to me)/i.test(uLower)) {
      pts += 4;
    }

    if (/(?:missed you|glad to talk|how was your day|how are you feeling)/i.test(uLower)) {
      pts += 3;
    }

    return pts;
  }

  public getCurrentStage(progress: RelationshipProgress): RelationshipStage {
    return (
      progress.stages.find((s) => s.id === progress.currentStageId) ||
      progress.stages[0]
    );
  }

  public getNextStage(progress: RelationshipProgress): RelationshipStage | null {
    const sorted = [...progress.stages].sort((a, b) => a.minPoints - b.minPoints);
    const currIdx = sorted.findIndex((s) => s.id === progress.currentStageId);
    if (currIdx !== -1 && currIdx < sorted.length - 1) {
      return sorted[currIdx + 1];
    }
    return null;
  }
}

export const relationshipEngine = new RelationshipEngine();
