import { getChosungs, isSyllable } from '@tgh/hangul';

export const START_MS = 60_000;
export const MAX_MS = 60_000;
export const BONUS_MS = 3_000;
export const PENALTY_MS = 1_000;

export type Reason = 'length' | 'chosung' | 'duplicate' | 'unknown';

export const REASON_TEXT: Record<Reason, string> = {
  length: '두 글자로 입력해 주세요',
  chosung: '초성이 달라요',
  duplicate: '이미 쓴 단어예요',
  unknown: '사전에 없는 단어예요',
};

export type SubmitResult =
  { ok: true; word: string } | { ok: false; word: string; reason: Reason; penalty: boolean };

/** 입력 정규화: NFC, 앞뒤 공백 제거. */
export function normalize(raw: string): string {
  return raw.normalize('NFC').trim();
}

/** §2.2 검증. 통과하면 null, 아니면 실패 이유. */
export function validate(
  word: string,
  pair: string,
  dict: ReadonlySet<string>,
  found: ReadonlySet<string>,
): Reason | null {
  const chars = [...word];
  if (chars.length !== 2 || !chars.every(isSyllable)) return 'length';
  if (getChosungs(word) !== pair) return 'chosung';
  if (found.has(word)) return 'duplicate';
  if (!dict.has(word)) return 'unknown';
  return null;
}

/** 단어 10개마다 0.1배씩 빨라지고 최대 2배. 정수 연산으로 부동소수점 오차를 피한다. */
export function drainRate(foundCount: number): number {
  return Math.min(20, 10 + Math.floor(foundCount / 10)) / 10;
}

export class Game {
  timeLeft = START_MS;
  readonly found: string[] = [];
  private readonly foundSet = new Set<string>();

  constructor(
    readonly pair: string,
    private readonly dict: ReadonlySet<string>,
  ) {}

  get over(): boolean {
    return this.timeLeft <= 0;
  }

  tick(dtMs: number): void {
    if (this.over) return;
    this.timeLeft = Math.max(0, this.timeLeft - dtMs * drainRate(this.found.length));
  }

  submit(raw: string): SubmitResult {
    const word = normalize(raw);
    const reason = validate(word, this.pair, this.dict, this.foundSet);
    if (reason) {
      // 사전에 없는 단어만 감점: 아무 음절이나 막 치는 걸 막기 위해 (§2.2)
      const penalty = reason === 'unknown';
      if (penalty) this.timeLeft = Math.max(0, this.timeLeft - PENALTY_MS);
      return { ok: false, word, reason, penalty };
    }
    this.found.push(word);
    this.foundSet.add(word);
    this.timeLeft = Math.min(MAX_MS, this.timeLeft + BONUS_MS);
    return { ok: true, word };
  }
}

/** 못 찾은 단어 중 흔한 순(rank 오름차순)으로 n개. */
export function missedWords(
  words: readonly (readonly [string, number])[],
  found: ReadonlySet<string>,
  n = 10,
): string[] {
  return words
    .filter(([w]) => !found.has(w))
    .sort((a, b) => a[1] - b[1])
    .slice(0, n)
    .map(([w]) => w);
}

export const SITE_URL = 'chosung.uzun-choi.com';

/** §3.3 공유 문구. 찾은 단어는 앞 5개만. */
export function shareText(pair: string, found: readonly string[]): string {
  const head = found.slice(0, 5).join(' ');
  const words = found.length > 5 ? `${head} …` : head;
  return [`${pair} 초성게임 — ${found.length}단어 생존`, words, SITE_URL]
    .filter(Boolean)
    .join('\n');
}
