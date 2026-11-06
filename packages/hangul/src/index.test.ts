import { describe, expect, it } from 'vitest';
import { getChosung, getChosungs, isSyllable } from './index';

describe('getChosung', () => {
  it('extracts the initial consonant', () => {
    expect([...'감사'].map(getChosung)).toEqual(['ㄱ', 'ㅅ']);
    expect(getChosung('까')).toBe('ㄲ');
    expect(getChosung('힣')).toBe('ㅎ');
  });

  it('returns null for non-syllables', () => {
    expect(getChosung('a')).toBeNull();
    expect(getChosung('ㄱ')).toBeNull();
    expect(getChosung('')).toBeNull();
    expect(getChosung('가나')).toBeNull();
  });
});

describe('isSyllable', () => {
  it('accepts only a single precomposed syllable', () => {
    expect(isSyllable('가')).toBe(true);
    expect(isSyllable('힣')).toBe(true);
    expect(isSyllable('ㄱ')).toBe(false);
    expect(isSyllable('a')).toBe(false);
    expect(isSyllable('가'.normalize('NFD'))).toBe(false);
  });
});

describe('getChosungs', () => {
  it('maps every syllable', () => {
    expect(getChosungs('감사')).toBe('ㄱㅅ');
    expect(getChosungs('까시')).toBe('ㄲㅅ');
    expect(getChosungs('대한민국')).toBe('ㄷㅎㅁㄱ');
  });

  it('returns null if any character is not a syllable', () => {
    expect(getChosungs('감a')).toBeNull();
    expect(getChosungs('감 사')).toBeNull();
  });
});
