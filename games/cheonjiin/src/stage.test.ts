import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, nextLevel, stage } from './stage';

describe('단계', () => {
  it('목표를 넘기면 다음 단계, 못 넘기면 그대로', () => {
    expect(nextLevel(1, stage(1).target)).toBe(2);
    expect(nextLevel(3, stage(3).target - 1)).toBe(3);
  });

  it('마지막 단계는 넘어도 마지막 단계', () => {
    expect(nextLevel(MAX_LEVEL, 9999)).toBe(MAX_LEVEL);
    expect(stage(99).level).toBe(MAX_LEVEL);
    expect(stage(0).level).toBe(1);
  });

  it('단계가 오를수록 시간은 줄거나 같고, 목표는 늘거나 같다', () => {
    for (let lv = 2; lv <= MAX_LEVEL; lv++) {
      expect(stage(lv).ms).toBeLessThanOrEqual(stage(lv - 1).ms);
      expect(stage(lv).target).toBeGreaterThanOrEqual(stage(lv - 1).target);
    }
  });
});
