/**
 * ㄱㅅ 사전 만들기: `npm run build:chosung -w @tgh/dict-pipeline`
 *
 * raw/ 안의 파일을 전부 읽는다 (zip은 먼저 풀어둔다).
 * - 한국어기초사전 LMF XML(<LexicalEntry>)은 '흔한 단어'로 순위를 매긴다.
 * - 그 밖의 JSON/XML(우리말샘·표준국어대사전)은 정답 인정용으로 전부 받는다. 방언·옛말·북한어도 포함.
 * - extra.txt(커밋됨)는 사전에 없는 신조어 등을 직접 보탠다.
 * - blocked.txt의 말은 정답에서 빼고, no-seed.txt의 말은 정답으로만 두고 '못 찾은 단어' 예시 뒤로 미룬다.
 * 출력: games/chosung/public/dict/index.json, <초성인덱스>-<초성인덱스>.json
 */
import { readFileSync, readdirSync, rmSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHOSUNG_LIST } from '@tgh/hangul';
import {
  RARE,
  addWord,
  cleanWord,
  extractBasic,
  extractHeadwords,
  type PairTable,
} from './extract.ts';
import { wordList } from './lists.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const RAW = join(ROOT, 'raw');
const OUT = join(ROOT, '../../games/chosung/public/dict');
/** 출제 대상: 흔한 단어(기초사전)가 이만큼 있는 쌍. 기초사전이 없으면 전체 단어 수로 판단. */
const MIN_COMMON = 25;
const MIN_TOTAL = 80;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(json|xml|txt)$/i.test(name) ? [p] : [];
  });
}

const isBlocked = wordList('blocked.txt');
const isNoSeed = wordList('no-seed.txt');

mkdirSync(RAW, { recursive: true });
const table: PairTable = { pairs: new Map() };
function add(raw: string, rank: number): void {
  const w = cleanWord(raw);
  if (isBlocked(w)) return;
  addWord(table, raw, isNoSeed(w) ? RARE : rank);
}
let hasBasic = false;

for (const file of files(RAW)) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('<LexicalEntry')) {
    hasBasic = true;
    for (const [w, rank] of extractBasic(text)) add(w, rank);
  } else {
    for (const w of extractHeadwords(text)) add(w, RARE);
  }
  console.log('읽음', file.slice(RAW.length + 1));
}
for (const line of readFileSync(join(ROOT, 'extra.txt'), 'utf8').split('\n')) {
  const w = line.trim();
  if (w && !w.startsWith('#')) add(w, RARE - 1);
}

if (!table.pairs.size || !files(RAW).length) {
  console.error('raw/에 사전 파일이 없어요. 기존 사전을 그대로 둡니다.');
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const index: { pair: string; total: number }[] = [];
let words = 0;
for (const [pair, map] of [...table.pairs].sort(([a], [b]) => a.localeCompare(b, 'ko'))) {
  const list = [...map].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'ko'));
  const common = list.filter(([, r]) => r < RARE - 1).length;
  const file = [...pair].map((c) => CHOSUNG_LIST.indexOf(c)).join('-');
  writeFileSync(join(OUT, `${file}.json`), JSON.stringify({ words: list }));
  words += list.length;
  if (hasBasic ? common >= MIN_COMMON : list.length >= MIN_TOTAL)
    index.push({ pair, total: list.length });
}
writeFileSync(
  join(OUT, 'LICENSE.txt'),
  [
    '이 폴더의 단어 목록은 국립국어원 우리말샘·표준국어대사전·한국어기초사전의 표제어를 가공한 것입니다.',
    '원본: https://opendict.korean.go.kr, https://stdict.korean.go.kr, https://krdict.korean.go.kr',
    '라이선스: 크리에이티브 커먼즈 저작자표시-동일조건변경허락 2.0 대한민국 (CC BY-SA 2.0 KR)',
    'https://creativecommons.org/licenses/by-sa/2.0/kr/',
    '',
  ].join('\n'),
);
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ pairs: index }, null, 2) + '\n');
console.log(`단어 ${words}개, 쌍 ${table.pairs.size}개, 출제 대상 ${index.length}개`);
