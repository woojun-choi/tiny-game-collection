import { getChosungs } from '@tgh/hangul';

/** 표제어의 띄어쓰기·붙임표·어깨번호 표시를 떼고 한글 음절만 남긴다. */
export function cleanWord(raw: string): string {
  return raw.replace(/[\^\-·ㆍ\s\d()]/g, '');
}

/** 두 음절 현대 한글 단어만 통과. */
export function isTwoSyllable(word: string): boolean {
  return /^[가-힣]{2}$/.test(word);
}

/**
 * 우리말샘·표준국어대사전 내려받기(JSON/XML)에서 표제어를 뽑는다.
 * 형식이 조금 달라도 동작하도록 `word` 필드만 정규식으로 찾는다.
 */
export function extractHeadwords(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/"word"\s*:\s*"([^"]+)"/g)) out.push(m[1]!);
  for (const m of text.matchAll(/<word>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/word>/g))
    out.push(m[1]!);
  return out;
}

/** 한국어기초사전 LMF XML: 표제어, 어휘 등급(초급 1, 중급 2, 고급 3, 없음 4), 품사. */
export function extractBasic(text: string): [string, number, string][] {
  const out: [string, number, string][] = [];
  for (const m of text.matchAll(/<LexicalEntry[\s\S]*?<\/LexicalEntry>/g)) {
    const block = m[0];
    const word = /att="writtenForm" val="([^"]+)"/.exec(block)?.[1];
    if (!word) continue;
    const level = /att="vocabularyLevel" val="([^"]+)"/.exec(block)?.[1];
    const pos = /att="partOfSpeech" val="([^"]+)"/.exec(block)?.[1] ?? '';
    out.push([word, level === '초급' ? 1 : level === '중급' ? 2 : level === '고급' ? 3 : 4, pos]);
  }
  return out;
}

/** 기초사전에 없는 단어의 순위. 결과 화면 '놓친 단어'에서 맨 뒤로 간다. */
export const RARE = 9;

export interface PairTable {
  /** 초성 쌍 → 단어 → 순위 */
  pairs: Map<string, Map<string, number>>;
}

export function addWord(table: PairTable, raw: string, rank: number): void {
  const word = cleanWord(raw);
  if (!isTwoSyllable(word)) return;
  const pair = getChosungs(word);
  if (!pair) return;
  let words = table.pairs.get(pair);
  if (!words) table.pairs.set(pair, (words = new Map()));
  words.set(word, Math.min(words.get(word) ?? RARE, rank));
}
