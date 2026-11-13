/**
 * ㄱㄴ 단어 뜻 만들기: `npm run build:chosung-defs -w @tgh/dict-pipeline`
 *
 * 이미 만들어 둔 쌍별 사전(games/chosung/public/dict/<쌍>.json)의 단어마다 뜻을 붙인다.
 * 사전과 같은 쌍 단위로 나눠, 결과 화면에서는 그 판의 초성 파일 하나만 받는다.
 * 흔한 단어(기초사전에 있는 말)는 풀이 최대 2개, 나머지는 1개.
 * 출력: games/chosung/public/defs/<쌍>.json  { "단어": ["품사", "풀이", …] }, LICENSE.txt
 * (dict/는 build:chosung이 통째로 다시 만들어서 따로 둔다)
 */
import { readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RARE } from './extract.ts';
import { LICENSE, collectSenses, pickEntry } from './defs.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const DICT = join(ROOT, '../../games/chosung/public/dict');
const OUT = join(ROOT, '../../games/chosung/public/defs');

/** 파일 이름(0-9) → [단어, 순위] 목록 */
const pairs = new Map<string, [string, number][]>();
for (const name of readdirSync(DICT)) {
  if (!/^\d+-\d+\.json$/.test(name)) continue;
  const { words } = JSON.parse(readFileSync(join(DICT, name), 'utf8')) as {
    words: [string, number][];
  };
  pairs.set(name, words);
}
const words = new Set([...pairs.values()].flatMap((list) => list.map(([w]) => w)));
const senses = collectSenses(words);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let bytes = 0;
let missing = 0;
for (const [name, list] of pairs) {
  const out: Record<string, string[]> = {};
  for (const [w, rank] of list) {
    const s = senses.get(w);
    if (!s) {
      missing++;
      continue;
    }
    // 순위가 RARE 미만이면 기초사전(흔한 단어)에서 온 말
    out[w] = pickEntry(s, rank < RARE - 1 ? 2 : 1);
  }
  const json = JSON.stringify(out);
  bytes += Buffer.byteLength(json);
  writeFileSync(join(OUT, name), json);
}
writeFileSync(join(OUT, 'LICENSE.txt'), LICENSE);
console.log(
  `뜻 ${words.size - missing}/${words.size}개 (없음 ${missing}), 합계 ${(bytes / 1e6).toFixed(1)}MB`,
);
