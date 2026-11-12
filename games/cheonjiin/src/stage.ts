import type { BoardOptions } from './board';

/**
 * 단계 모드: 목표 점수를 넘기면 다음 단계, 못 넘기면 같은 단계를 다시.
 * 단계가 오를수록 심는 단어가 줄고(채움 글자가 늘고), 긴 단어 비율이 늘고, 시간이 줄어든다.
 * 판은 화면과 상관없이 휴대폰 판(8×11)이라 목표 점수가 기기마다 같다.
 */
export interface Stage {
  level: number;
  ms: number;
  target: number;
  board: BoardOptions;
}

// prettier-ignore
const TABLE: [ms: number, target: number, board: BoardOptions][] = [
  [60_000, 35, {}],
  [60_000, 40, { mix: [0.45, 0.38] }],
  [57_000, 45, { mix: [0.45, 0.38] }],
  [55_000, 50, { mix: [0.4, 0.4], fillGaps: false, maxWords: 26 }],
  [55_000, 50, { mix: [0.35, 0.42], fillGaps: false, maxWords: 24 }],
  [52_000, 50, { mix: [0.3, 0.45], fillGaps: false, maxWords: 23 }],
  [50_000, 55, { mix: [0.3, 0.45], fillGaps: false, maxWords: 22 }],
  [48_000, 60, { mix: [0.25, 0.45], fillGaps: false, maxWords: 21 }],
  [45_000, 60, { mix: [0.25, 0.45], fillGaps: false, maxWords: 20 }],
  [45_000, 65, { mix: [0.2, 0.45], fillGaps: false, maxWords: 19 }],
];

export const MAX_LEVEL = TABLE.length;

/** 1부터. 마지막 단계를 넘으면 마지막 단계를 계속 한다. */
export function stage(level: number): Stage {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const [ms, target, board] = TABLE[lv - 1]!;
  return { level: lv, ms, target, board };
}

/** 판이 끝난 뒤 다음에 할 단계. 통과하면 하나 위(마지막이면 그대로), 못 하면 그대로. */
export function nextLevel(level: number, score: number): number {
  const st = stage(level);
  return score >= st.target ? Math.min(MAX_LEVEL, st.level + 1) : st.level;
}
