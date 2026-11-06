const KEY = 'cheonjiin.best';

export function getBest(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}

/** 점수를 기록하고 최고 기록과 갱신 여부를 돌려준다. 첫 판은 신기록으로 치지 않는다. */
export function recordScore(score: number): { best: number; isNew: boolean } {
  const prev = getBest();
  const isNew = prev !== null && score > prev;
  if (prev === null || score > prev) {
    try {
      localStorage.setItem(KEY, String(score));
    } catch {
      // 시크릿 모드 등 저장 불가 환경은 무시
    }
  }
  return { best: Math.max(prev ?? 0, score), isNew };
}
