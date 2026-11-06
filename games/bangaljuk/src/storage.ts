const KEY = 'bangaljuk.best';

/** 최고 기록 = 가장 낮은 평균 오차. */
export function getBest(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null || Number.isNaN(Number(v)) ? null : Number(v);
  } catch {
    return null;
  }
}

/** 기록을 남기고 최고 기록과 갱신 여부를 돌려준다. 첫 기록은 "신기록"으로 치지 않는다. */
export function recordAverage(avg: number): { best: number; isNew: boolean } {
  const prev = getBest();
  const isNew = prev !== null && avg < prev;
  if (prev === null || avg < prev) {
    try {
      localStorage.setItem(KEY, String(avg));
    } catch {
      // 저장 불가 환경은 무시
    }
  }
  return { best: prev === null ? avg : Math.min(prev, avg), isNew };
}
