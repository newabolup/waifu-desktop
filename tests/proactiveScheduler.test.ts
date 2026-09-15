import { describe, it, expect } from 'vitest';
import { ProactiveScheduler } from '../src/services/proactive/proactiveScheduler';

describe('ProactiveScheduler Logic', () => {
  const scheduler = new ProactiveScheduler();

  it('correctly calculates daytime time windows', () => {
    expect(scheduler.isWithinTimeWindow('09:00', '08:00', '10:30')).toBe(true);
    expect(scheduler.isWithinTimeWindow('07:30', '08:00', '10:30')).toBe(false);
    expect(scheduler.isWithinTimeWindow('11:00', '08:00', '10:30')).toBe(false);
  });

  it('correctly handles quiet hours spanning midnight (e.g. 23:00 to 08:00)', () => {
    // 23:30 is in quiet hours
    expect(scheduler.isWithinTimeWindow('23:30', '23:00', '08:00')).toBe(true);
    // 03:00 is in quiet hours
    expect(scheduler.isWithinTimeWindow('03:00', '23:00', '08:00')).toBe(true);
    // 07:59 is in quiet hours
    expect(scheduler.isWithinTimeWindow('07:59', '23:00', '08:00')).toBe(true);
    // 14:00 is NOT in quiet hours
    expect(scheduler.isWithinTimeWindow('14:00', '23:00', '08:00')).toBe(false);
  });
});
