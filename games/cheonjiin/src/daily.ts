/** 오늘의 퍼즐: 한국 시간 날짜로 판을 정해 모두 같은 판을 푼다. 서버 없이 시드만으로. */

/** 1회차 날짜. 이날이 #1. 판을 8×11로 바꾼 2026-11-09를 #0으로 다시 셌다 */
export const FIRST_DAY = '2026-11-10';
const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;

/** 한국 시간 기준 날짜 'YYYY-MM-DD' */
export function todayKey(now: number = Date.now()): string {
  return new Date(now + KST_MS).toISOString().slice(0, 10);
}

/** 날짜 문자열 → 32비트 시드 (FNV-1a) */
export function dailySeed(day: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** 회차 번호. FIRST_DAY가 1 */
export function dayNumber(day: string): number {
  return Math.round((Date.parse(day) - Date.parse(FIRST_DAY)) / DAY_MS) + 1;
}

export function prevDay(day: string): string {
  return new Date(Date.parse(day) - DAY_MS).toISOString().slice(0, 10);
}

export interface Streak {
  /** 마지막으로 오늘의 퍼즐을 끝낸 날 */
  last: string;
  count: number;
  best: number;
}

/** 오늘 퍼즐을 끝냈을 때 연속 기록. 같은 날 두 번은 그대로, 어제 이어서면 +1, 끊겼으면 1부터. */
export function nextStreak(prev: Streak | null, today: string): Streak {
  if (prev?.last === today) return prev;
  const count = prev?.last === prevDay(today) ? prev.count + 1 : 1;
  return { last: today, count, best: Math.max(prev?.best ?? 0, count) };
}

/** 화면에 보여 줄 현재 연속 일수. 어제나 오늘 끝냈으면 이어지는 중, 아니면 0. */
export function liveStreak(s: Streak | null, today: string): number {
  return s && (s.last === today || s.last === prevDay(today)) ? s.count : 0;
}
