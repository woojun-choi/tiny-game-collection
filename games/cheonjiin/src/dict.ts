/** 사전 두 개: 정답 인정용 전체 목록(words.txt)과 판 생성용 흔한 단어(common.json). */
export interface Dict {
  words: Set<string>;
  common: string[];
}

async function get(path: string): Promise<Response> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res;
}

// 상대경로: 웹 루트에서도, 앱(capacitor://localhost/)에서도 같은 위치.
let pending: Promise<Dict> | null = null;

/** 타이틀 화면에서 미리 받아 둔다. 실패하면 다음 호출 때 다시 받는다. */
export function loadDict(): Promise<Dict> {
  pending ??= Promise.all([
    get('dict/words.txt').then((r) => r.text()),
    get('dict/common.json').then((r) => r.json() as Promise<{ words: string[] }>),
  ]).then(([text, { words }]) => ({ words: new Set(text.split('\n')), common: words }));
  pending.catch(() => (pending = null));
  return pending;
}
