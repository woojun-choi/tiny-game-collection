import { CHOSUNG_LIST } from '@tgh/hangul';

/** `/dict/index.json`: 랜덤 출제 대상 초성 쌍과 단어 수. */
export interface DictIndex {
  pairs: { pair: string; total: number }[];
}

/** `/dict/<file>.json`: [단어, 빈도 순위] 목록. 순위가 낮을수록 흔한 단어. */
export interface PairDict {
  words: [string, number][];
  set: Set<string>;
}

/** 파일 이름은 초성 인덱스로 만든다 (ㄱㄴ → 0-2). URL에 한글을 넣지 않기 위해. */
export function pairFile(pair: string): string {
  return [...pair].map((c) => CHOSUNG_LIST.indexOf(c)).join('-');
}

// 상대경로: 웹 루트에서도, 앱(capacitor://localhost/)에서도 같은 위치.
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadIndex(): Promise<DictIndex> {
  return getJson<DictIndex>('dict/index.json');
}

const cache = new Map<string, Promise<PairDict>>();

/** 쌍별 사전을 한 번만 받는다. 결과 화면에서 미리 불러두는 용도로도 쓴다. */
export function loadPair(pair: string): Promise<PairDict> {
  let p = cache.get(pair);
  if (!p) {
    p = getJson<{ words: [string, number][] }>(`dict/${pairFile(pair)}.json`).then(({ words }) => ({
      words,
      set: new Set(words.map(([w]) => w)),
    }));
    p.catch(() => cache.delete(pair));
    cache.set(pair, p);
  }
  return p;
}
