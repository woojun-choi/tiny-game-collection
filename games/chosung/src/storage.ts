const PREFIX = 'giyeoksiot.best';

function read(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}

function write(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // 시크릿 모드 등 저장 불가 환경은 무시
  }
}

/** 전체 최고 기록 (pair 생략) 또는 초성 쌍별 최고 기록. */
export function getBest(pair?: string): number | null {
  return read(pair ? `${PREFIX}.${pair}` : PREFIX);
}

/** 점수를 기록하고, 해당 쌍의 최고 기록과 갱신 여부를 돌려준다. */
export function recordScore(pair: string, score: number): { best: number; isNew: boolean } {
  const prev = getBest(pair) ?? 0;
  const isNew = score > prev;
  if (isNew) write(`${PREFIX}.${pair}`, score);
  if (score > (getBest() ?? 0)) write(PREFIX, score);
  return { best: Math.max(prev, score), isNew };
}
