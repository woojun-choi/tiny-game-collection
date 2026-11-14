/** 오늘의 초성: 한국 시간 날짜로 초성 쌍을 정해 모두 같은 쌍을 푼다. 서버 없이 날짜만으로. */

/** 1회차 날짜. 이날이 #1 */
export const FIRST_DAY = '2026-11-14';
/** 단어가 이만큼은 있는 쌍만 낸다. 너무 적으면 하루 문제로 박하다 */
export const DAILY_MIN_WORDS = 300;
const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;

/** 한국 시간 기준 날짜 'YYYY-MM-DD' */
export function todayKey(now: number = Date.now()): string {
  return new Date(now + KST_MS).toISOString().slice(0, 10);
}

/** 문자열 → 32비트 해시 (FNV-1a) */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** 회차 번호. FIRST_DAY가 1 */
export function dayNumber(day: string): number {
  return Math.round((Date.parse(day) - Date.parse(FIRST_DAY)) / DAY_MS) + 1;
}

export function prevDay(day: string): string {
  return new Date(Date.parse(day) - DAY_MS).toISOString().slice(0, 10);
}

/**
 * 그날의 초성 쌍. 단어가 넉넉한 쌍을 고정된 순서로 섞어 하루에 하나씩 차례로 낸다.
 * 한 바퀴(쌍 수만큼의 날) 안에는 같은 쌍이 다시 나오지 않는다.
 */
export function dailyPair(pairs: readonly { pair: string; total: number }[], day: string): string {
  const pool = pairs
    .filter((p) => p.total >= DAILY_MIN_WORDS)
    .map((p) => p.pair)
    .sort((a, b) => hash(a) - hash(b) || (a < b ? -1 : 1));
  if (pool.length === 0) throw new Error('출제할 초성이 없어요');
  const n = pool.length;
  return pool[(((dayNumber(day) - 1) % n) + n) % n]!;
}

export interface Streak {
  /** 마지막으로 오늘의 초성을 끝낸 날 */
  last: string;
  count: number;
  best: number;
}

/** 오늘의 초성을 끝냈을 때 연속 기록. 같은 날 두 번은 그대로, 어제 이어서면 +1, 끊겼으면 1부터. */
export function nextStreak(prev: Streak | null, today: string): Streak {
  if (prev?.last === today) return prev;
  const count = prev?.last === prevDay(today) ? prev.count + 1 : 1;
  return { last: today, count, best: Math.max(prev?.best ?? 0, count) };
}

/** 화면에 보여 줄 현재 연속 일수. 어제나 오늘 끝냈으면 이어지는 중, 아니면 0. */
export function liveStreak(s: Streak | null, today: string): number {
  return s && (s.last === today || s.last === prevDay(today)) ? s.count : 0;
}
