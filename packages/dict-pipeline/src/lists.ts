import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;

/**
 * 패키지 루트의 단어 목록 파일을 읽어 검사 함수로 만든다.
 * 한 줄에 하나, '#'는 주석. '*'로 시작하면 그 글자가 들어간 단어를 모두 고른다.
 *   blocked.txt: 욕설·비하·성적 표현. 정답에서도, 화면에서도 뺀다.
 *   no-seed.txt: 정답으로는 인정하되 판에 심거나 예시로 먼저 보여 주지 않는 말.
 */
export function wordList(name: string): (w: string) => boolean {
  const lines = readFileSync(join(ROOT, name), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  const exact = new Set(lines.filter((l) => !l.startsWith('*')));
  const part = lines.filter((l) => l.startsWith('*')).map((l) => l.slice(1));
  return (w) => exact.has(w) || part.some((p) => w.includes(p));
}
