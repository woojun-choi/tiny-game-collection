/**
 * 단어 뜻. 사전 풀이는 첫 음절 코드로 256조각(dict/defs/N.json)에 나뉘어 있고,
 * 누른 단어가 든 조각만 받는다. 조각 하나는 수십 KB(gzip).
 * 형식: { "단어": ["품사", "풀이1", "풀이2"?] }
 */
export const SHARDS = 256;

export interface Meaning {
  pos: string;
  defs: string[];
}

const shards = new Map<number, Promise<Record<string, string[]>>>();

function shard(n: number): Promise<Record<string, string[]>> {
  let p = shards.get(n);
  if (!p) {
    p = fetch(`dict/defs/${n}.json`).then((r) => {
      if (!r.ok) throw new Error(`defs ${n}: ${r.status}`);
      return r.json() as Promise<Record<string, string[]>>;
    });
    // 실패하면 다음에 다시 받는다
    p.catch(() => shards.delete(n));
    shards.set(n, p);
  }
  return p;
}

/** 뜻이 없으면 null. 받지 못하면 예외. */
export async function lookup(word: string): Promise<Meaning | null> {
  const entry = (await shard(word.charCodeAt(0) % SHARDS))[word];
  if (!entry?.length) return null;
  const [pos = '', ...defs] = entry;
  return { pos, defs };
}
