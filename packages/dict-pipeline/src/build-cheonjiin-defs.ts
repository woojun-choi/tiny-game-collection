/**
 * 천지인 단어 뜻 만들기: `npm run build:cheonjiin-defs -w @tgh/dict-pipeline`
 *
 * 이미 만들어 둔 words.txt의 단어마다 뜻을 붙인다. words.txt·common.json은 건드리지 않는다
 * (오늘의 퍼즐 판이 common.json에서 나오므로 다시 만들면 판이 바뀔 수 있다).
 *
 * - 뜻 우선순위: 한국어기초사전(쉬운 풀이) → 표준국어대사전 → 우리말샘.
 * - 방언·옛말·북한어 풀이는 다른 풀이가 없을 때만 쓴다.
 * - 흔한 단어는 풀이 최대 2개, 나머지는 1개. 풀이마다 최대 60자.
 * - 첫 음절 코드로 256조각으로 나눠, 웹에서는 누른 단어의 조각만 받는다.
 * 출력: games/cheonjiin/public/dict/defs/0.json … 255.json  { "단어": ["품사", "풀이", …] }, LICENSE.txt
 */
import { readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cleanWord } from './extract.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const RAW = join(ROOT, 'raw');
const DICT = join(ROOT, '../../games/cheonjiin/public/dict');
const OUT = join(DICT, 'defs');

export const SHARDS = 256;
export const shardOf = (word: string) => word.charCodeAt(0) % SHARDS;

const MAX_SENSES = 2;
const MAX_LEN = 60;
/** 판에 심는 흔한 단어(common.json)만 풀이 2개, 나머지는 1개. 용량 때문. */
const common = new Set<string>(
  (JSON.parse(readFileSync(join(DICT, 'common.json'), 'utf8')) as { words: string[] }).words,
);

const words = new Set(readFileSync(join(DICT, 'words.txt'), 'utf8').split('\n').filter(Boolean));

interface Sense {
  pos: string;
  def: string;
  /** 0 기초사전, 1 표준 일반어, 2 우리말샘 일반어, 3 방언·옛말·북한어 등 */
  rank: number;
}
const senses = new Map<string, Sense[]>();

function clean(def: string): string {
  let d = def
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp;)?quot;/g, '"')
    .replace(/&(amp;)?lt;/g, '<')
    .replace(/&(amp;)?gt;/g, '>')
    .replace(/&(amp;)?amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (d.length > MAX_LEN) d = d.slice(0, MAX_LEN - 1).trimEnd() + '…';
  return d;
}

function add(raw: string, pos: string, def: string, rank: number) {
  const w = cleanWord(raw);
  if (!words.has(w) || !def) return;
  const list = senses.get(w) ?? [];
  const d = clean(def);
  // 같은 풀이(앞부분이 같으면 같은 것으로 본다)는 한 번만
  if (list.some((s) => s.def.slice(0, 20) === d.slice(0, 20))) return;
  list.push({ pos, def: d, rank });
  senses.set(w, list);
}

const cdata = (s: string | undefined) => (s ?? '').replace(/^<!\[CDATA\[|\]\]>$/g, '');

/** 기초사전 LMF XML */
function readBasic(text: string) {
  for (const m of text.matchAll(/<LexicalEntry[\s\S]*?<\/LexicalEntry>/g)) {
    const block = m[0];
    const word = /att="writtenForm" val="([^"]+)"/.exec(block)?.[1];
    if (!word) continue;
    const pos = /att="partOfSpeech" val="([^"]+)"/.exec(block)?.[1] ?? '';
    // 외국어 풀이(Equivalent)·예문·그림을 걷어 낸 뒤 Sense마다 한국어 풀이 하나
    const plain = block.replace(/<(Equivalent|SenseExample|Multimedia)>[\s\S]*?<\/\1>/g, '');
    for (const s of plain.matchAll(/<Sense [^>]*>([\s\S]*?)(?=<Sense |<\/LexicalEntry>)/g)) {
      const def = /<feat att="definition" val="([^"]*)"/.exec(s[1]!)?.[1];
      if (def) add(word, pos, def, 0);
    }
  }
}

/** 표준국어대사전·우리말샘 XML(item 단위) */
function readItems(text: string, base: number) {
  for (const m of text.matchAll(/<item>[\s\S]*?<\/item>/g)) {
    const block = m[0];
    const word = cdata(/<word>([\s\S]*?)<\/word>/.exec(block)?.[1]);
    if (!word || !words.has(cleanWord(word))) continue;
    for (const p of block.matchAll(/<pos_info>[\s\S]*?<\/pos_info>/g)) {
      const pos = /<pos>([^<]*)<\/pos>/.exec(p[0])?.[1] ?? '';
      for (const s of p[0].matchAll(/<sense_info>[\s\S]*?<\/sense_info>/g)) {
        const type = /<type>([^<]*)<\/type>/.exec(s[0])?.[1] ?? '일반어';
        const def = cdata(/<definition>([\s\S]*?)<\/definition>/.exec(s[0])?.[1]);
        add(word, pos === '품사 없음' ? '' : pos, def, type === '일반어' ? base : 3);
      }
    }
  }
}

/** 우리말샘 XML(item 하나 = 뜻 하나) */
function readOpen(text: string) {
  for (const m of text.matchAll(/<item>[\s\S]*?<\/item>/g)) {
    const block = m[0];
    const word = cdata(/<word>([\s\S]*?)<\/word>/.exec(block)?.[1]);
    if (!word || !words.has(cleanWord(word))) continue;
    for (const s of block.matchAll(/<senseInfo>[\s\S]*?<\/senseInfo>/g)) {
      const pos = /<pos>([^<]*)<\/pos>/.exec(s[0])?.[1] ?? '';
      const type = /<type>([^<]*)<\/type>/.exec(s[0])?.[1] ?? '일반어';
      const def = cdata(/<definition>([\s\S]*?)<\/definition>/.exec(s[0])?.[1]);
      add(word, pos === '품사 없음' ? '' : pos, def, type === '일반어' ? 2 : 3);
    }
  }
}

function files(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? files(p) : /\.xml$/i.test(name) ? [p] : [];
    });
  } catch {
    return [];
  }
}

for (const file of files(join(RAW, 'krdict'))) readBasic(readFileSync(file, 'utf8'));
console.log('기초사전 읽음', senses.size);
for (const file of files(join(RAW, 'stdict'))) readItems(readFileSync(file, 'utf8'), 1);
console.log('표준국어대사전 읽음', senses.size);
for (const file of files(join(RAW, 'opendict'))) readOpen(readFileSync(file, 'utf8'));
console.log('우리말샘 읽음', senses.size);

if (!senses.size) {
  console.error('raw/에 사전 파일이 없어요.');
  process.exit(1);
}

const shards: Record<string, string[]>[] = Array.from({ length: SHARDS }, () => ({}));
let missing = 0;
for (const w of words) {
  const list = senses.get(w);
  if (!list) {
    missing++;
    continue;
  }
  // 가장 좋은 출처 한 곳의 풀이만, 원래 순서(뜻 번호) 그대로
  const best = Math.min(...list.map((s) => s.rank));
  const pick = list
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.rank === best)
    .slice(0, common.has(w) ? MAX_SENSES : 1);
  const pos = pick[0]!.pos;
  shards[shardOf(w)]![w] = [pos, ...pick.map((s) => s.def)];
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let bytes = 0;
shards.forEach((s, i) => {
  const json = JSON.stringify(s);
  bytes += Buffer.byteLength(json);
  writeFileSync(join(OUT, `${i}.json`), json);
});
writeFileSync(
  join(OUT, 'LICENSE.txt'),
  [
    '이 폴더의 뜻풀이는 국립국어원 한국어기초사전·표준국어대사전·우리말샘의 풀이를 가공한 것입니다.',
    '단어마다 풀이를 1~2개만 골랐고, 60자가 넘는 풀이는 줄였습니다(…).',
    '원본: https://krdict.korean.go.kr, https://stdict.korean.go.kr, https://opendict.korean.go.kr',
    '라이선스: 크리에이티브 커먼즈 저작자표시-동일조건변경허락 2.0 대한민국 (CC BY-SA 2.0 KR)',
    'https://creativecommons.org/licenses/by-sa/2.0/kr/',
    '',
  ].join('\n'),
);
console.log(
  `뜻 ${words.size - missing}/${words.size}개 (없음 ${missing}), 합계 ${(bytes / 1e6).toFixed(1)}MB`,
);
