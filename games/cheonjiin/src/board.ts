/**
 * 판 생성. 무작위 음절로는 단어가 거의 안 생기므로, 흔한 단어를 빈자리에 '심는다'.
 * 2·3음절은 가로나 세로로, 4음절은 가로·세로·2×2 블록으로 놓는다.
 * 어느 쪽이든 읽는 순서(위→아래, 왼→오)로 읽으면 단어가 된다.
 * 같은 시드면 같은 판이 나온다.
 */
export interface Placement {
  word: string;
  /** 칸 번호(행 우선), 오름차순 = 읽는 순서 */
  cells: number[];
}

export interface Board {
  cols: number;
  rows: number;
  /** 행 우선. 지워진 칸은 null */
  cells: (string | null)[];
  planted: Placement[];
}

/** 시드 → 0 이상 1 미만 난수. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Shape = 'h' | 'v' | 'b';

/** (r, c)를 왼쪽 위로 하는 자리. 판 밖이면 null. */
function spot(r: number, c: number, len: number, shape: Shape, cols: number, rows: number) {
  const i = r * cols + c;
  if (shape === 'h') return c + len <= cols ? Array.from({ length: len }, (_, k) => i + k) : null;
  if (shape === 'v')
    return r + len <= rows ? Array.from({ length: len }, (_, k) => i + k * cols) : null;
  return len === 4 && r + 1 < rows && c + 1 < cols ? [i, i + 1, i + cols, i + cols + 1] : null;
}

/** 판 크기에 따른 최소 심은 단어 수. 칸의 약 3분의 1 (9×13 → 39, 18×9 → 54). */
export function minPlanted(cols: number, rows: number): number {
  return Math.floor((cols * rows) / 3);
}

export function generateBoard(
  seed: number,
  cols: number,
  rows: number,
  common: readonly string[],
): Board {
  const rand = mulberry32(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
  const byLen = new Map<number, string[]>([2, 3, 4].map((n) => [n, []]));
  for (const w of common) byLen.get(w.length)?.push(w);

  let best: Board | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const board = tryOnce();
    if (!best || board.planted.length > best.planted.length) best = board;
    if (board.planted.length >= minPlanted(cols, rows)) break;
  }
  return best!;

  function tryOnce(): Board {
    const cells: (string | null)[] = Array(cols * rows).fill(null);
    const planted: Placement[] = [];
    const used = new Set<string>();

    const freeSpots = (len: number, shapes: Shape[]) => {
      const out: number[][] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          for (const s of shapes) {
            const at = spot(r, c, len, s, cols, rows);
            if (at && at.every((i) => cells[i] === null)) out.push(at);
          }
      return out;
    };
    const place = (word: string, at: number[]) => {
      [...word].forEach((ch, k) => (cells[at[k]!] = ch));
      planted.push({ word, cells: at });
      used.add(word);
    };
    const freshWord = (len: number) => {
      const list = byLen.get(len)!;
      for (let k = 0; k < 20; k++) {
        const w = pick(list);
        if (!used.has(w)) return w;
      }
      return null;
    };

    // 1) 길이를 섞어서 (2음절 50%, 3음절 35%, 4음절 15%) 빈자리에 심는다
    for (let fails = 0; fails < 40;) {
      const x = rand();
      const len = x < 0.5 ? 2 : x < 0.85 ? 3 : 4;
      const word = freshWord(len);
      const spots = word ? freeSpots(len, len === 4 ? ['h', 'v', 'b'] : ['h', 'v']) : [];
      if (!word || !spots.length) {
        fails++;
        continue;
      }
      place(word, pick(spots));
    }
    // 2) 남은 틈을 2음절로 메운다
    for (let spots = freeSpots(2, ['h', 'v']); spots.length; spots = freeSpots(2, ['h', 'v'])) {
      const word = freshWord(2);
      if (!word) break;
      place(word, pick(spots));
    }
    // 3) 그래도 남은 칸은 심은 단어의 음절로 채워 '아깝게 틀린' 조합을 만든다
    const pool = planted.flatMap((p) => [...p.word]);
    for (let i = 0; i < cells.length; i++) cells[i] ??= pick(pool);

    // 예전엔 여기서 칸마다 난수를 하나씩 뽑아 장식 키를 골랐다. 장식 키는 없앴지만
    // 같은 시드에서 같은 판(오늘의 퍼즐)이 나오도록 난수 소비는 그대로 둔다.
    for (let i = 0; i < cells.length; i++) rand();
    return { cols, rows, cells, planted };
  }
}
