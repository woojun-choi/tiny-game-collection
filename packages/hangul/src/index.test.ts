import { describe, expect, it } from 'vitest';
import { getChosung } from './index';

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
  });
});
