/**
 * 실루엣 마스크(RGBA, size×size)를 직선 a→b로 나눴을 때 양쪽 픽셀 수.
 * 알파 128 이상을 물체로 본다. 오목한 도형이 여러 조각으로 나뉘어도 같은 쪽이면 한 조각으로 센다.
 * 반환: [왼쪽(외적 > 0), 오른쪽(외적 ≤ 0)]
 */
export function splitArea(
  rgba: ArrayLike<number>,
  size: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): [number, number] {
  const dx = bx - ax;
  const dy = by - ay;
  let pos = 0;
  let neg = 0;
  for (let y = 0; y < size; y++) {
    const ry = y + 0.5 - ay;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      if ((rgba[(row + x) * 4 + 3] ?? 0) < 128) continue;
      if (dx * ry - dy * (x + 0.5 - ax) > 0) pos++;
      else neg++;
    }
  }
  return [pos, neg];
}
