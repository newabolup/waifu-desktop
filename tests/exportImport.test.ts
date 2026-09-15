import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CHARACTER,
  DEFAULT_PROVIDERS,
  DEFAULT_APP_SETTINGS,
  DEFAULT_EMOTIONS,
  DEFAULT_RELATIONSHIP,
} from '../src/services/storage/defaults';

describe('Import & Export Integrity', () => {
  it('serializes and deserializes full backup payload correctly', () => {
    const backup = {
      version: '1.0.0',
      timestamp: Date.now(),
      characters: [DEFAULT_CHARACTER],
      conversations: [],
      messages: [],
      memories: [],
      blacklist: [],
      providers: DEFAULT_PROVIDERS,
      proactiveRules: [],
      settings: DEFAULT_APP_SETTINGS,
      emotionalState: DEFAULT_EMOTIONS,
      relationship: DEFAULT_RELATIONSHIP,
    };

    const serialized = JSON.stringify(backup);
    expect(serialized).toBeDefined();

    const parsed = JSON.parse(serialized);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.characters[0].name).toBe('Kizuna');
    expect(parsed.providers.length).toBe(DEFAULT_PROVIDERS.length);
    expect(parsed.settings.theme).toBe('dark-sakura');
    expect(parsed.emotionalState.happiness).toBe(85);
  });
});
