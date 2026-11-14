import { describe, expect, it } from 'vitest';
import { dailyPair, dayNumber, liveStreak, nextStreak, prevDay, todayKey } from './daily';

const PAIRS = [
  { pair: 'ㄱㄴ', total: 900 },
  { pair: 'ㄱㅅ', total: 1200 },
  { pair: 'ㅂㅈ', total: 400 },
  { pair: 'ㅋㅋ', total: 20 },
];

describe('오늘의 초성', () => {
  it('날짜는 한국 시간 기준', () => {
    // UTC 11/7 15:00 = KST 11/8 00:00
    expect(todayKey(Date.UTC(2026, 10, 7, 14, 59))).toBe('2026-11-07');
    expect(todayKey(Date.UTC(2026, 10, 7, 15, 0))).toBe('2026-11-08');
  });

  it('회차와 전날', () => {
    expect(dayNumber('2026-11-14')).toBe(1);
    expect(dayNumber('2026-12-01')).toBe(18);
    expect(prevDay('2026-03-01')).toBe('2026-02-28');
  });

  it('같은 날은 같은 쌍, 한 바퀴 안에는 겹치지 않고, 단어가 적은 쌍은 빠진다', () => {
    expect(dailyPair(PAIRS, '2026-11-20')).toBe(dailyPair(PAIRS, '2026-11-20'));
    const days = ['2026-11-14', '2026-11-15', '2026-11-16'].map((d) => dailyPair(PAIRS, d));
    expect(new Set(days).size).toBe(3);
    expect(days).not.toContain('ㅋㅋ');
    // 순서는 목록 순서와 상관없다
    expect(dailyPair([...PAIRS].reverse(), '2026-11-15')).toBe(days[1]);
    // 1회차 전 날짜도 깨지지 않는다
    expect(PAIRS.map((p) => p.pair)).toContain(dailyPair(PAIRS, '2026-11-01'));
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
