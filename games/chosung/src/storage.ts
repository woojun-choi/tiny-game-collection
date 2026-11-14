import { load, save } from '@tgh/ui/app';
import { nextStreak, type Streak } from './daily';

const PREFIX = 'giyeoksiot.best';

function read(key: string): number | null {
  const v = load(key);
  return v === null ? null : Number(v) || 0;
}

function write(key: string, value: number): void {
  save(key, String(value));
}

/** 전체 최고 기록 (pair 생략) 또는 초성 쌍별 최고 기록. */
export function getBest(pair?: string): number | null {
  return read(pair ? `${PREFIX}.${pair}` : PREFIX);
}

/** 점수를 기록하고, 해당 쌍의 최고 기록과 갱신 여부를 돌려준다. */
export function recordScore(pair: string, score: number): { best: number; isNew: boolean } {
  const prev = getBest(pair) ?? 0;
  const isNew = score > prev;
  if (isNew) write(`${PREFIX}.${pair}`, score);
  if (score > (getBest() ?? 0)) write(PREFIX, score);
  return { best: Math.max(prev, score), isNew };
}

// ---------- 오늘의 초성 ----------

const DAILY = 'giyeoksiot.daily';
const STREAK = 'giyeoksiot.streak';

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(load(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

/** 오늘의 초성 기록. 하루 첫 판만 남긴다. */
export interface DailyRecord {
  day: string;
  pair: string;
  score: number;
}

export function getDaily(day: string): DailyRecord | null {
  const r = readJson<DailyRecord>(DAILY);
  return r?.day === day ? r : null;
}

export function getStreak(): Streak | null {
  return readJson<Streak>(STREAK);
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
  save(DAILY, JSON.stringify(rec));
  save(STREAK, JSON.stringify(streak));
  return { first: true, record: rec, streak };
}
