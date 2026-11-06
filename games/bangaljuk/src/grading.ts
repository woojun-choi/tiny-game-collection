export type Grade = 'S' | 'A' | 'B' | 'C';

/** 소수 첫째 자리 반올림. 화면에 보이는 값과 등급 판정이 어긋나지 않도록 모든 비율을 이 값으로 다룬다. */
export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** §3.1 기준: 오차(%p) ≤1 S, ≤3 A, ≤7 B, 그 외 C. */
export function gradeFor(error: number): Grade {
  if (error <= 1) return 'S';
  if (error <= 3) return 'A';
  if (error <= 7) return 'B';
  return 'C';
}

export type CutJudgement =
  | { valid: false; reason: 'miss' | 'sliver' }
  | { valid: true; smaller: number; larger: number; error: number; grade: Grade };

/** 양쪽 면적(픽셀 수)으로 컷을 판정한다. 한쪽이 0이면 빗나감, 1% 미만이면 부스러기. */
export function judgeCut(sideA: number, sideB: number): CutJudgement {
  const total = sideA + sideB;
  const min = Math.min(sideA, sideB);
  if (total === 0 || min === 0) return { valid: false, reason: 'miss' };
  if (min / total < 0.01) return { valid: false, reason: 'sliver' };
  const smaller = round1((min / total) * 100);
  const error = round1(50 - smaller);
  return { valid: true, smaller, larger: round1(100 - smaller), error, grade: gradeFor(error) };
}

/** §3.2 최종 결과: 라운드 오차 평균. */
export function finalResult(errors: readonly number[]): { avg: number; grade: Grade } {
  const avg = errors.length ? round1(errors.reduce((s, e) => s + e, 0) / errors.length) : 0;
  return { avg, grade: gradeFor(avg) };
}

export const REACTIONS: Record<Grade, readonly string[]> = {
  S: ['완벽한 반갈죽!', '자로 잰 줄', '이 정도면 국가대표'],
  A: ['거의 장인', '오 좀 치는데?', '아깝다 한 끗 차이'],
  B: ['형이 더 먹는다', '애매~하다', '눈대중 실화?'],
  C: ['이건 싸움 난다', '칼 처음 잡아봄?', '반의 뜻을 다시 생각해보자'],
};

export const MISS_REACTIONS: Record<'miss' | 'sliver', readonly string[]> = {
  miss: ['허공을 갈랐다!', '공기만 반갈죽'],
  sliver: ['부스러기만 떨어졌다!', '끄트머리만 살짝…'],
};

export function pick<T>(list: readonly T[], rng: () => number = Math.random): T {
  return list[Math.floor(rng() * list.length)] as T;
}

export const GRADE_EMOJI: Record<Grade, string> = { S: '🟩', A: '🟨', B: '🟧', C: '🟥' };

export const SITE_URL = 'bangaljuk.uzun-choi.com';

/** §4 공유 문구. */
export function shareText(avg: number, grade: Grade, grades: readonly Grade[]): string {
  return [
    `반갈죽 🔪 평균 오차 ${avg.toFixed(1)}% (${grade})`,
    grades.map((g) => GRADE_EMOJI[g]).join(''),
    SITE_URL,
  ].join('\n');
}
