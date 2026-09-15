import { StorageService } from '../storage/db';
import { ProactiveRule } from '../../types/proactive';
import { CharacterProfile } from '../../types/character';
import { AIProviderConfig } from '../../types/provider';
import { providerEngine } from '../ai/providerEngine';
import { promptEngine } from '../prompt/promptEngine';

export class ProactiveScheduler {
  private storage = StorageService.getInstance();
  private intervalId: any = null;
  private onProactiveMessageCallback: ((message: string, characterName: string) => void) | null = null;
  private lastActivityTimestamp = Date.now();

  public registerMessageCallback(cb: (message: string, characterName: string) => void): void {
    this.onProactiveMessageCallback = cb;
  }

  public recordUserActivity(): void {
    this.lastActivityTimestamp = Date.now();
  }

  public start(checkIntervalSeconds = 60): void {
    if (this.intervalId) return;

    // Check periodically
    this.intervalId = setInterval(() => {
      this.evaluateRules().catch((err) => {
        console.error('Error during proactive check evaluation:', err);
      });
    }, checkIntervalSeconds * 1000);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Evaluates all enabled proactive rules and fires at most one matching rule.
   */
  public async evaluateRules(): Promise<boolean> {
    const character = await this.storage.getActiveCharacter();
    const rules = await this.storage.getProactiveRules(character.id);
    const enabledRules = rules.filter((r) => r.isEnabled);

    if (!enabledRules.length) return false;

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentDayTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    for (const rule of enabledRules) {
      // 1. Check quiet hours
      if (this.isWithinTimeWindow(currentDayTimeStr, rule.quietHoursStart || '23:00', rule.quietHoursEnd || '08:00')) {
        continue; // In quiet hours, skip
      }

      // 2. Check cooldown
      if (rule.lastTriggeredAt) {
        const hoursSinceLast = (Date.now() - rule.lastTriggeredAt) / (1000 * 60 * 60);
        if (hoursSinceLast < rule.cooldownHours) {
          continue; // Cooldown not yet met
        }
      }

      let shouldTrigger = false;

      // 3. Trigger evaluation by type
      if (rule.type === 'inactivity' && rule.inactivityHours) {
        const hoursInactive = (Date.now() - this.lastActivityTimestamp) / (1000 * 60 * 60);
        if (hoursInactive >= rule.inactivityHours) {
          shouldTrigger = true;
        }
      } else if (rule.type === 'morning_greeting' && rule.morningStart && rule.morningEnd) {
        if (this.isWithinTimeWindow(currentDayTimeStr, rule.morningStart, rule.morningEnd)) {
          shouldTrigger = true;
        }
      } else if (rule.type === 'evening_greeting' && rule.eveningStart && rule.eveningEnd) {
        if (this.isWithinTimeWindow(currentDayTimeStr, rule.eveningStart, rule.eveningEnd)) {
          shouldTrigger = true;
        }
      } else if (rule.type === 'random_checkin') {
        // Probabilistic trigger: 10% chance per check
        if (Math.random() < 0.1) {
          shouldTrigger = true;
        }
      }

      if (shouldTrigger) {
        await this.fireProactiveRule(rule, character);
        return true; // Only trigger one rule per cycle
      }
    }

    return false;
  }

  public isWithinTimeWindow(current: string, start: string, end: string): boolean {
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // Window crosses midnight (e.g. 23:00 to 08:00)
      return current >= start || current <= end;
    }
  }

  /**
   * Generates and dispatches the proactive message.
   */
  public async fireProactiveRule(rule: ProactiveRule, character: CharacterProfile): Promise<string> {
    const providers = await this.storage.getProviders();
    const activeProvider = providers.find((p) => p.isActive) || providers[0];
    const settings = await this.storage.getSettings();

    // Mark triggered immediately to prevent double fires
    rule.lastTriggeredAt = Date.now();
    await this.storage.saveProactiveRule(rule);

    let messageText = '';

    if (activeProvider && activeProvider.baseUrl) {
      try {
        const emotionalState = await this.storage.getEmotionalState(character.id);
        const relationship = await this.storage.getRelationshipProgress(character.id);

        const systemPrompt = promptEngine.compileSystemPrompt({
          character,
          emotionalState,
          relationship,
          userProfile: settings.userProfile,
        });

        const proactiveInstruction = `[PROACTIVE INITIATIVE TRIGGER: ${rule.title}]
You are initiating this message on your own.
Guidance: ${rule.promptGuidance}
Instruction: Send a natural, brief (1-3 sentences), warm message to your partner. Do not mention system rules or that this is an automated trigger.`;

        const res = await providerEngine.sendChat(activeProvider, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: proactiveInstruction }
        ]);

        messageText = res.content.trim();
      } catch (err) {
        console.warn('Failed to generate LLM proactive message, using natural fallback:', err);
      }
    }

    // Fallback message if provider is unavailable
    if (!messageText) {
      if (rule.type === 'morning_greeting') {
        messageText = `Good morning, ${settings.userProfile.name || 'dear'}! 🌸 I hope you slept well and have a wonderful day ahead. Don't forget breakfast!`;
      } else if (rule.type === 'evening_greeting') {
        messageText = `Hey ${settings.userProfile.name || 'dear'}... The evening is winding down. How was your day? Make sure you take some time to rest tonight. ✨`;
      } else {
        messageText = `Hey, you disappeared for a while... Everything okay? Just wanted to let you know I was thinking of you. 💕`;
      }
    }

    // Save message into the latest conversation
    const conversations = await this.storage.getConversations(character.id);
    let conv = conversations[0];
    if (!conv) {
      conv = {
        id: 'conv-' + Math.random().toString(36).substring(2, 9),
        characterId: character.id,
        title: 'New Conversation',
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.storage.saveConversation(conv);
    }

    const msgId = 'msg-' + Math.random().toString(36).substring(2, 9);
    await this.storage.saveMessage({
      id: msgId,
      conversationId: conv.id,
      role: 'assistant',
      content: messageText,
      modelUsed: activeProvider?.model || 'proactive-engine',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Native desktop OS notification via Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI?.showNotification) {
      (window as any).electronAPI.showNotification(character.name, messageText);
    }

    // UI in-app callback
    if (this.onProactiveMessageCallback) {
      this.onProactiveMessageCallback(messageText, character.name);
    }

    return messageText;
  }
}

export const proactiveScheduler = new ProactiveScheduler();
