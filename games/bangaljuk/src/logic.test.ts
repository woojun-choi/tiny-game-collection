import { describe, expect, it } from 'vitest';
import { finalResult, gradeFor, judgeCut, shareText } from './grading';
import { splitArea } from './measure';
import { pickRounds, type CatalogEntry } from './rounds';

/** 테스트용 원형 마스크 (RGBA). */
function circleMask(size: number, cx: number, cy: number, r: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) data[(y * size + x) * 4 + 3] = 255;
  return data;
}

function ratio(mask: Uint8ClampedArray, size: number, ...line: [number, number, number, number]) {
  const [a, b] = splitArea(mask, size, ...line);
  return judgeCut(a, b);
}

describe('splitArea + judgeCut', () => {
  const size = 512;
  const mask = circleMask(size, 256, 256, 150);

  it('reads 50:50 (±0.2) through the center of a symmetric shape', () => {
    for (const line of [
      [256, 0, 256, 512],
      [0, 256, 512, 256],
      [0, 0, 512, 512],
      [100, 30, 412, 482],
    ] as [number, number, number, number][]) {
      const j = ratio(mask, size, ...line);
      expect(j.valid).toBe(true);
      if (j.valid) expect(j.smaller).toBeGreaterThanOrEqual(49.8);
    }
  });

  it('is independent of drag direction', () => {
    const a = ratio(mask, size, 200, 0, 220, 512);
    const b = ratio(mask, size, 220, 512, 200, 0);
    expect(a).toEqual(b);
  });

  it('measures off-center cuts', () => {
    // 중심에서 r/2 떨어진 현: 작은 쪽 ≈ 19.6%
    const j = ratio(mask, size, 331, 0, 331, 512);
    expect(j.valid && j.smaller).toBeCloseTo(19.6, 0);
  });

  it('treats a line that misses the object as a miss', () => {
    expect(ratio(mask, size, 10, 0, 10, 512)).toEqual({ valid: false, reason: 'miss' });
  });

  it('rejects slivers under 1%', () => {
    expect(ratio(mask, size, 404, 0, 404, 512)).toEqual({ valid: false, reason: 'sliver' });
  });

  it('counts fragments of a concave shape on the same side together', () => {
    // 원 두 개(같은 크기)를 세로선으로 하나씩 나누면 50:50
    const m = circleMask(size, 128, 256, 80);
    const m2 = circleMask(size, 384, 256, 80);
    for (let i = 0; i < m.length; i++) m[i] = Math.max(m[i] ?? 0, m2[i] ?? 0);
    const j = ratio(m, size, 0, 256, 512, 256);
    expect(j.valid && j.smaller).toBeGreaterThanOrEqual(49.8);
  });
});

describe('grading', () => {
  it('follows §3.1 thresholds', () => {
    expect(gradeFor(0)).toBe('S');
    expect(gradeFor(1)).toBe('S');
    expect(gradeFor(1.1)).toBe('A');
    expect(gradeFor(3)).toBe('A');
    expect(gradeFor(3.1)).toBe('B');
    expect(gradeFor(7)).toBe('B');
    expect(gradeFor(7.1)).toBe('C');
  });

  it('puts the smaller piece first and sums to 100', () => {
    expect(judgeCut(522, 478)).toEqual({
      valid: true,
      smaller: 47.8,
      larger: 52.2,
      error: 2.2,
      grade: 'A',
    });
  });

  it('grades the displayed (rounded) value', () => {
    // 49.04% → 화면에 49.0 : 51.0 → 오차 1.0 → S
    const j = judgeCut(4904, 5096);
    expect(j).toMatchObject({ smaller: 49, error: 1, grade: 'S' });
  });

  it('averages round errors', () => {
    expect(finalResult([0.4, 2.2, 5.1, 0.8, 3.5])).toEqual({ avg: 2.4, grade: 'A' });
  });

  it('builds the share text', () => {
    expect(shareText(2.4, 'A', ['S', 'A', 'S', 'B', 'A'])).toBe(
      '반갈죽 🔪 평균 오차 2.4% (A)\n🟩🟨🟩🟧🟨\nbangaljuk.uzun-choi.com',
    );
  });
});

describe('pickRounds', () => {
  const catalog: CatalogEntry[] = [
    { id: 'circle', type: 'shape', difficulties: ['easy', 'normal'] },
    { id: 'star', type: 'shape', difficulties: ['easy', 'normal', 'hard'] },
    { id: 'blob', type: 'shape', difficulties: ['normal', 'hard'] },
    { id: 'baguette', type: 'stick', difficulties: ['easy', 'normal', 'hard'] },
    { id: 'pencil', type: 'stick', difficulties: ['normal', 'hard'] },
    { id: 'cake', type: 'food', difficulties: ['easy', 'normal'] },
    { id: 'donut', type: 'food', difficulties: ['easy', 'normal', 'hard'] },
  ];

  function seeded(seed: number) {
    return () => {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32;
    };
  }

  it('picks 5 unique objects of at least 2 types, matching difficulty tags', () => {
    for (let s = 1; s < 200; s++) {
      const rounds = pickRounds(catalog, seeded(s));
      expect(rounds).toHaveLength(5);
      expect(new Set(rounds.map((r) => r.objectId)).size).toBe(5);
      expect(new Set(rounds.map((r) => r.type)).size).toBeGreaterThanOrEqual(2);
      for (const r of rounds) {
        const entry = catalog.find((e) => e.id === r.objectId)!;
        expect(entry.difficulties).toContain(r.difficulty);
      }
    }
  });

  it('keeps every placement inside the play area', () => {
    for (let s = 1; s < 200; s++) {
      for (const { placement: p } of pickRounds(catalog, seeded(s))) {
        expect(p.s * Math.max(p.sx, p.sy) * Math.SQRT2).toBeLessThan(0.5);
      }
    }
  });

  it('only rotates easy rounds by 0', () => {
    for (let s = 1; s < 100; s++)
      for (const r of pickRounds(catalog, seeded(s)))
        if (r.difficulty === 'easy') expect(r.placement.rot).toBe(0);
  });
});
