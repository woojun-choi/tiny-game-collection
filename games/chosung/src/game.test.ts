import { describe, expect, it } from 'vitest';
import { Game, MAX_MS, START_MS, drainRate, missedWords, shareText, validate } from './game';

const dict = new Set(['감사', '가수', '기사', '고속', '공사', '각시']);
const none = new Set<string>();

describe('validate', () => {
  it('accepts dictionary words matching the pair', () => {
    expect(validate('감사', 'ㄱㅅ', dict, none)).toBeNull();
    expect(validate('가수', 'ㄱㅅ', dict, none)).toBeNull();
  });

  it('rejects words that are not exactly 2 syllables', () => {
    expect(validate('감', 'ㄱㅅ', dict, none)).toBe('length');
    expect(validate('감사합', 'ㄱㅅ', dict, none)).toBe('length');
    expect(validate('ㄱㅅ', 'ㄱㅅ', dict, none)).toBe('length');
    expect(validate('ab', 'ㄱㅅ', dict, none)).toBe('length');
    expect(validate('', 'ㄱㅅ', dict, none)).toBe('length');
  });

  it('treats double consonants as distinct', () => {
    expect(validate('까시', 'ㄱㅅ', dict, none)).toBe('chosung');
  });

  it('rejects duplicates and unknown words', () => {
    expect(validate('감사', 'ㄱㅅ', dict, new Set(['감사']))).toBe('duplicate');
    expect(validate('각사', 'ㄱㅅ', dict, none)).toBe('unknown');
  });
});

describe('drainRate', () => {
  it('speeds up 0.1x per 10 words, capped at 2x', () => {
    expect(drainRate(0)).toBe(1);
    expect(drainRate(9)).toBe(1);
    expect(drainRate(10)).toBe(1.1);
    expect(drainRate(35)).toBe(1.3);
    expect(drainRate(100)).toBe(2);
    expect(drainRate(500)).toBe(2);
  });
});

describe('Game', () => {
  it('adds 3s per valid word, capped at 60s', () => {
    const g = new Game('ㄱㅅ', dict);
    g.tick(5_000);
    expect(g.submit(' 감사 ')).toEqual({ ok: true, word: '감사' });
    expect(g.timeLeft).toBe(58_000);
    g.submit('가수');
    expect(g.timeLeft).toBe(MAX_MS);
    expect(g.found).toEqual(['감사', '가수']);
  });

  it('normalizes decomposed input before checking', () => {
    const g = new Game('ㄱㅅ', dict);
    expect(g.submit('감사'.normalize('NFD')).ok).toBe(true);
  });

  it('penalizes only unknown words', () => {
    const g = new Game('ㄱㅅ', dict);
    g.submit('감사');
    const before = g.timeLeft;
    expect(g.submit('까시')).toMatchObject({ ok: false, reason: 'chosung', penalty: false });
    expect(g.submit('감사')).toMatchObject({ ok: false, reason: 'duplicate', penalty: false });
    expect(g.submit('가')).toMatchObject({ ok: false, reason: 'length', penalty: false });
    expect(g.timeLeft).toBe(before);
    expect(g.submit('각사')).toMatchObject({ ok: false, reason: 'unknown', penalty: true });
    expect(g.timeLeft).toBe(before - 1_000);
  });

  it('ends at zero and never goes negative', () => {
    const g = new Game('ㄱㅅ', dict);
    g.tick(START_MS - 500);
    g.submit('각사');
    expect(g.timeLeft).toBe(0);
    expect(g.over).toBe(true);
  });

  it('drains faster after 10 words', () => {
    const g = new Game('ㄱㅅ', dict);
    for (let i = 0; i < 10; i++) g.found.push(`x${i}`);
    g.tick(1_000);
    expect(g.timeLeft).toBe(START_MS - 1_100);
  });
});

describe('missedWords', () => {
  it('returns the most common unfound words', () => {
    const words = [
      ['기사', 3],
      ['감사', 1],
      ['가수', 2],
      ['고속', 4],
    ] as const;
    expect(missedWords(words, new Set(['감사']), 2)).toEqual(['가수', '기사']);
  });
});

describe('shareText', () => {
  it('shows only the first 5 found words', () => {
    expect(shareText('ㄱㅅ', ['감사', '가수', '기사', '고속', '공사', '각시'])).toBe(
      'ㄱㅅ 초성게임 — 6단어 생존\n감사 가수 기사 고속 공사 …\nchosung.uzun-choi.com',
    );
  });

  it('omits the word line when nothing was found', () => {
    expect(shareText('ㄱㅅ', [])).toBe('ㄱㅅ 초성게임 — 0단어 생존\nchosung.uzun-choi.com');
  });

  it('daily: hides the words, shows the day number and streak', () => {
    expect(shareText('ㄱㅅ', ['감사', '가수'], { no: 3, streak: 2 })).toBe(
      'ㄱㄴ 오늘의 초성 #3 — ㄱㅅ 2단어\n연속 2일째\nchosung.uzun-choi.com',
    );
    expect(shareText('ㄱㅅ', ['감사'], { no: 1, streak: 1 })).toBe(
      'ㄱㄴ 오늘의 초성 #1 — ㄱㅅ 1단어\nchosung.uzun-choi.com',
    );
  });
});
