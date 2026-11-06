export type ObjType = 'shape' | 'stick' | 'food';
export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export interface CatalogEntry {
  id: string;
  type: ObjType;
  difficulties: readonly Difficulty[];
}

/** 플레이 영역(0~1 정규화 좌표)에서 물체의 배치. 물체 로컬 좌표는 -1~1. */
export interface Placement {
  x: number;
  y: number;
  rot: number;
  s: number;
  sx: number;
  sy: number;
}

export interface RoundSpec {
  objectId: string;
  type: ObjType;
  difficulty: Difficulty;
  placement: Placement;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
const DEG = Math.PI / 180;

/**
 * §2.4 난이도별 배치. 회전해도 플레이 영역을 벗어나지 않게 크기를 잡았다
 * (로컬 반지름 1 × s × 최대 늘림 × √2 < 0.5).
 */
export function placementFor(difficulty: Difficulty, rng: () => number): Placement {
  const base = { x: 0.5, y: 0.5 };
  if (difficulty === 'easy') return { ...base, rot: 0, s: 0.34, sx: 1, sy: 1 };
  if (difficulty === 'normal') {
    const stretch = 1 + (rng() * 2 - 1) * 0.12;
    return { ...base, rot: (rng() * 2 - 1) * 20 * DEG, s: 0.28, sx: stretch, sy: 1 / stretch };
  }
  const rot = rng() * Math.PI * 2;
  if (rng() < 0.5) return { ...base, rot, s: 0.2, sx: 1, sy: 1 }; // 작게
  return rng() < 0.5 // 길쭉하게
    ? { ...base, rot, s: 0.26, sx: 1.3, sy: 0.65 }
    : { ...base, rot, s: 0.26, sx: 0.65, sy: 1.3 };
}

/** 5라운드 구성: 물체 중복 없음, 최소 2가지 유형 (§2.3). */
export function pickRounds(
  catalog: readonly CatalogEntry[],
  rng: () => number = Math.random,
  count = 5,
): RoundSpec[] {
  for (;;) {
    const used = new Set<string>();
    const rounds: RoundSpec[] = [];
    for (let i = 0; i < count; i++) {
      const difficulty = DIFFICULTIES[Math.floor(rng() * DIFFICULTIES.length)] ?? 'easy';
      let pool = catalog.filter((e) => !used.has(e.id) && e.difficulties.includes(difficulty));
      if (!pool.length) pool = catalog.filter((e) => !used.has(e.id));
      const obj = pool[Math.floor(rng() * pool.length)];
      if (!obj) throw new Error('라운드 수보다 물체가 적어요');
      used.add(obj.id);
      rounds.push({
        objectId: obj.id,
        type: obj.type,
        difficulty,
        placement: placementFor(difficulty, rng),
      });
    }
    if (new Set(rounds.map((r) => r.type)).size >= 2) return rounds;
  }
}
