import { nextStreak, type Streak } from './daily';
import { load, save } from '@tgh/ui/app';

const KEY = 'cheonjiin.best';
// 오늘의 퍼즐 판을 9×13에서 8×11로 바꾸며(2026-11-09) 기록을 새로 시작했다
const DAILY = 'cheonjiin.daily2';
const STREAK = 'cheonjiin.streak2';

function read<T>(key: string): T | null {
  const v = load(key);
  if (v === null) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  save(key, JSON.stringify(value));
}

export function getBest(): number | null {
  const v = read<number>(KEY);
  return v === null ? null : Number(v) || 0;
}

/** 점수를 기록하고 최고 기록과 갱신 여부를 돌려준다. 첫 판은 신기록으로 치지 않는다. */
export function recordScore(score: number): { best: number; isNew: boolean } {
  const prev = getBest();
  const isNew = prev !== null && score > prev;
  if (prev === null || score > prev) write(KEY, score);
  return { best: Math.max(prev ?? 0, score), isNew };
}

/** 오늘의 퍼즐 기록. 하루 첫 판만 남긴다. */
export interface DailyRecord {
  day: string;
  score: number;
  words: number;
}

export function getDaily(day: string): DailyRecord | null {
  const r = read<DailyRecord>(DAILY);
  return r?.day === day ? r : null;
}

export function getStreak(): Streak | null {
  return read<Streak>(STREAK);
}

/** 오늘 첫 판이면 기록하고 연속 기록을 올린다. 이미 했으면 처음 기록을 돌려준다. */
export function recordDaily(rec: DailyRecord): {
  first: boolean;
  record: DailyRecord;
  streak: Streak;
} {
  const prev = getDaily(rec.day);
  if (prev) return { first: false, record: prev, streak: getStreak() ?? nextStreak(null, rec.day) };
  const streak = nextStreak(getStreak(), rec.day);
  write(DAILY, rec);
  write(STREAK, streak);
  return { first: true, record: rec, streak };
}

/** 단계 모드: 다음에 할 단계와 지금까지 통과한 가장 높은 단계(0 = 아직 없음). */
export interface StageRecord {
  level: number;
  best: number;
}

const STAGE = 'cheonjiin.stage';

export function getStage(): StageRecord {
  const r = read<StageRecord>(STAGE);
  return { level: Math.max(1, Number(r?.level) || 1), best: Math.max(0, Number(r?.best) || 0) };
}

/** 판 결과를 남긴다. 통과했으면 최고 단계를 올리고, 다음 단계를 정한다. */
export function recordStage(level: number, passed: boolean, next: number): StageRecord {
  const prev = getStage();
  const rec = { level: next, best: passed ? Math.max(prev.best, level) : prev.best };
  write(STAGE, rec);
  return rec;
}

/** 첫 판이 끝났는지. 첫 판(과 그 결과 화면)에는 광고를 띄우지 않는다. */
const PLAYED = 'cheonjiin.played';
export function hasPlayed(): boolean {
  return read<boolean>(PLAYED) === true;
}
export function markPlayed(): void {
  write(PLAYED, true);
}

/** '오늘 하루 배너 끄기': 보상형 광고를 끝까지 본 날 */
const AD_FREE = 'cheonjiin.adfree';
export function isAdFree(day: string): boolean {
  return read<string>(AD_FREE) === day;
}
export function setAdFree(day: string): void {
  write(AD_FREE, day);
}
