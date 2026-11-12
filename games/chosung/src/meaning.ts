/**
 * 단어 뜻. 풀이는 쌍별 사전과 같은 단위로 나뉘어 있다(defs/0-9.json).
 * 결과 화면의 단어는 모두 그 판의 초성이라 파일 하나만 받으면 된다.
 * 형식: { "단어": ["품사", "풀이1", "풀이2"?] }
 */
import { pairFile } from './dict';

export interface Meaning {
  pos: string;
  defs: string[];
}

const files = new Map<string, Promise<Record<string, string[]>>>();

function load(pair: string): Promise<Record<string, string[]>> {
  let p = files.get(pair);
  if (!p) {
    p = fetch(`defs/${pairFile(pair)}.json`).then((r) => {
      if (!r.ok) throw new Error(`defs ${pair}: ${r.status}`);
      return r.json() as Promise<Record<string, string[]>>;
    });
    // 실패하면 다음에 다시 받는다
    p.catch(() => files.delete(pair));
    files.set(pair, p);
  }
  return p;
}

/** 결과 화면이 뜰 때 미리 받아 두면 단어를 누르자마자 뜻이 보인다 */
export function preload(pair: string): void {
  load(pair).catch(() => {});
}

/** 뜻이 없으면 null. 받지 못하면 예외. */
export async function lookup(pair: string, word: string): Promise<Meaning | null> {
  const entry = (await load(pair))[word];
  if (!entry?.length) return null;
  const [pos = '', ...defs] = entry;
  return { pos, defs };
}
