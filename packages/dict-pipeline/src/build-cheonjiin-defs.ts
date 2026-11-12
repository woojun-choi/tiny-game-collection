/**
 * 천지인 단어 뜻 만들기: `npm run build:cheonjiin-defs -w @tgh/dict-pipeline`
 *
 * 이미 만들어 둔 words.txt의 단어마다 뜻을 붙인다. words.txt·common.json은 건드리지 않는다
 * (오늘의 퍼즐 판이 common.json에서 나오므로 다시 만들면 판이 바뀔 수 있다).
 *
 * - 뜻 고르기는 defs.ts. 흔한 단어는 풀이 최대 2개, 나머지는 1개.
 * - 첫 음절 코드로 256조각으로 나눠, 웹에서는 누른 단어의 조각만 받는다.
 * 출력: games/cheonjiin/public/dict/defs/0.json … 255.json  { "단어": ["품사", "풀이", …] }, LICENSE.txt
 */
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LICENSE, collectSenses, pickEntry } from './defs.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const DICT = join(ROOT, '../../games/cheonjiin/public/dict');
const OUT = join(DICT, 'defs');

export const SHARDS = 256;
export const shardOf = (word: string) => word.charCodeAt(0) % SHARDS;

const MAX_SENSES = 2;
/** 판에 심는 흔한 단어(common.json)만 풀이 2개, 나머지는 1개. 용량 때문. */
const common = new Set<string>(
  (JSON.parse(readFileSync(join(DICT, 'common.json'), 'utf8')) as { words: string[] }).words,
);

const words = new Set(readFileSync(join(DICT, 'words.txt'), 'utf8').split('\n').filter(Boolean));
const senses = collectSenses(words);

const shards: Record<string, string[]>[] = Array.from({ length: SHARDS }, () => ({}));
let missing = 0;
for (const w of words) {
  const list = senses.get(w);
  if (!list) {
    missing++;
    continue;
  }
  shards[shardOf(w)]![w] = pickEntry(list, common.has(w) ? MAX_SENSES : 1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let bytes = 0;
shards.forEach((s, i) => {
  const json = JSON.stringify(s);
  bytes += Buffer.byteLength(json);
  writeFileSync(join(OUT, `${i}.json`), json);
});
writeFileSync(join(OUT, 'LICENSE.txt'), LICENSE);
console.log(
  `뜻 ${words.size - missing}/${words.size}개 (없음 ${missing}), 합계 ${(bytes / 1e6).toFixed(1)}MB`,
);
