/** 선택·점수 규칙. DOM과 무관한 순수 함수만. */

export const GAME_MS = 120_000;
export const COMBO_WINDOW_MS = 3_000;
export const CLEAR_BONUS = 30;
const BASE: Record<number, number> = { 2: 2, 3: 6, 4: 12 };
export const COMBO = [1, 1.2, 1.5, 2] as const;

/** 두 칸을 꼭짓점으로 하는 직사각형 안의 칸 번호, 읽는 순서(행 우선). */
export function rectCells(a: number, b: number, cols: number): number[] {
  const [r0, r1] = [Math.floor(a / cols), Math.floor(b / cols)].sort((x, y) => x - y) as [
    number,
    number,
  ];
  const [c0, c1] = [a % cols, b % cols].sort((x, y) => x - y) as [number, number];
  const out: number[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(r * cols + c);
  return out;
}

/** 직사각형에서 빈칸을 빼고 남은 키와 읽은 글자. */
export function readSelection(
  cells: readonly (string | null)[],
  rect: readonly number[],
): { keys: number[]; text: string } {
  const keys = rect.filter((i) => cells[i] != null);
  return { keys, text: keys.map((i) => cells[i]).join('') };
}

/** 정답이 되는 길이: 2~4음절. */
export function isValidLength(text: string): boolean {
  return text.length >= 2 && text.length <= 4;
}

/** 직전 정답에서 3초 안이면 콤보 단계를 하나 올리고(최대 ×2.0), 아니면 처음(×1.0)으로. */
export function nextCombo(step: number, lastAt: number | null, now: number): number {
  return lastAt !== null && now - lastAt <= COMBO_WINDOW_MS
    ? Math.min(step + 1, COMBO.length - 1)
    : 0;
}

/** 2음절 2점, 3음절 6점, 4음절 12점에 콤보 배율. */
export function points(length: number, comboStep: number): number {
  return Math.round((BASE[length] ?? 0) * COMBO[comboStep]!);
}
