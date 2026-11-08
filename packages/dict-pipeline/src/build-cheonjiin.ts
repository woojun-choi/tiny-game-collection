/**
 * 천지인 사전 만들기: `npm run build:cheonjiin -w @tgh/dict-pipeline`
 *
 * - 정답 인정(words.txt): 표준국어대사전·한국어기초사전의 2~4음절 표제어 전부,
 *   그리고 ㄱㅅ와 같은 기준으로 우리말샘의 2음절 표제어. 우리말샘 3~4음절까지 넣으면
 *   두 배 넘게 커져서(gzip 2MB+) 뺐다.
 * - 판 생성(common.json): 한국어기초사전 초급·중급 명사. 판에 심는 단어는 익숙한 말이어야 한다.
 * 출력: games/cheonjiin/public/dict/words.txt, common.json, LICENSE.txt
 */
import { readFileSync, readdirSync, rmSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanWord, extractBasic, extractHeadwords } from './extract.ts';
import { wordList } from './lists.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const RAW = join(ROOT, 'raw');
const OUT = join(ROOT, '../../games/cheonjiin/public/dict');

/** blocked.txt: 욕설·비하·성적 표현. 정답에서도 판에서도 뺀다. */
const isBlocked = wordList('blocked.txt');
/** no-seed.txt: 정답으로는 인정하되 판에 심지는 않는 말(술·담배·약물·폭력·속옷 등, 연령 등급). */
const isNoSeed = wordList('no-seed.txt');

const isWord = (w: string) => /^[가-힣]{2,4}$/.test(w) && !isBlocked(w);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(json|xml)$/i.test(name) ? [p] : [];
  });
}

mkdirSync(RAW, { recursive: true });
const words = new Set<string>();
/** 판 생성용: 단어 → 등급(1 초급, 2 중급) */
const common = new Map<string, number>();

for (const file of files(RAW)) {
  const text = readFileSync(file, 'utf8');
  const opendict = file.includes('/opendict/');
  if (text.includes('<LexicalEntry')) {
    for (const [raw, level, pos] of extractBasic(text)) {
      const w = cleanWord(raw);
      if (!isWord(w)) continue;
      words.add(w);
      if (level <= 2 && pos === '명사' && !isNoSeed(w))
        common.set(w, Math.min(common.get(w) ?? 9, level));
    }
  } else {
    for (const raw of extractHeadwords(text)) {
      const w = cleanWord(raw);
      if (isWord(w) && (!opendict || w.length === 2)) words.add(w);
    }
  }
  console.log('읽음', file.slice(RAW.length + 1));
}

if (!words.size) {
  console.error('raw/에 사전 파일이 없어요. 기존 사전을 그대로 둡니다.');
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const sorted = [...words].sort();
writeFileSync(join(OUT, 'words.txt'), sorted.join('\n') + '\n');
const commonList = [...common]
  .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'ko'))
  .map(([w]) => w);
writeFileSync(join(OUT, 'common.json'), JSON.stringify({ words: commonList }));
writeFileSync(
  join(OUT, 'LICENSE.txt'),
  [
    '이 폴더의 단어 목록은 국립국어원 표준국어대사전·한국어기초사전·우리말샘의 표제어를 가공한 것입니다.',
    '원본: https://stdict.korean.go.kr, https://krdict.korean.go.kr, https://opendict.korean.go.kr',
    '라이선스: 크리에이티브 커먼즈 저작자표시-동일조건변경허락 2.0 대한민국 (CC BY-SA 2.0 KR)',
    'https://creativecommons.org/licenses/by-sa/2.0/kr/',
    '',
  ].join('\n'),
);
const byLen = (list: string[]) => [2, 3, 4].map((n) => list.filter((w) => w.length === n).length);
console.log(`정답 ${sorted.length}개 (2/3/4음절 ${byLen(sorted).join('/')})`);
console.log(`판 생성용 ${commonList.length}개 (2/3/4음절 ${byLen(commonList).join('/')})`);
