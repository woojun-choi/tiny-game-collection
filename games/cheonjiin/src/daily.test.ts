import { describe, expect, it } from 'vitest';
import { dailySeed, dayNumber, liveStreak, nextStreak, prevDay, todayKey } from './daily';

describe('오늘의 퍼즐', () => {
  it('날짜는 한국 시간 기준', () => {
    // UTC 11/7 15:00 = KST 11/8 00:00
    expect(todayKey(Date.UTC(2026, 10, 7, 14, 59))).toBe('2026-11-07');
    expect(todayKey(Date.UTC(2026, 10, 7, 15, 0))).toBe('2026-11-08');
  });

  it('같은 날은 같은 시드, 다른 날은 다른 시드', () => {
    expect(dailySeed('2026-11-08')).toBe(dailySeed('2026-11-08'));
    expect(dailySeed('2026-11-08')).not.toBe(dailySeed('2026-11-09'));
  });

  it('회차와 전날', () => {
    expect(dayNumber('2026-11-07')).toBe(1);
    expect(dayNumber('2026-12-01')).toBe(25);
    expect(prevDay('2026-03-01')).toBe('2026-02-28');
  });

  it('연속 기록', () => {
    const a = nextStreak(null, '2026-11-08');
    expect(a).toEqual({ last: '2026-11-08', count: 1, best: 1 });
    expect(nextStreak(a, '2026-11-08')).toBe(a);
    const b = nextStreak(a, '2026-11-09');
    expect(b.count).toBe(2);
    const c = nextStreak(b, '2026-11-11');
    expect(c).toEqual({ last: '2026-11-11', count: 1, best: 2 });
    expect(liveStreak(b, '2026-11-10')).toBe(2);
    expect(liveStreak(b, '2026-11-11')).toBe(0);
  });
});
