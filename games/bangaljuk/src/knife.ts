/**
 * 식칼. 칼끝부터 손잡이 끝까지 윗선(y = 8)이 한 줄로 이어지고,
 * 칼날 아래 선만 곡선으로 올라가 칼끝에서 만난다.
 * 칼등 쪽 얇은 먹색 띠 + 종이색 칼날, 먹색 받침과 손잡이(리벳 3개).
 * 타이틀·HUD 아이콘(SVG)과 컷 연출(캔버스)이 같은 모양을 쓴다.
 * 좌표계: 164 × 44, 칼끝이 왼쪽, 칼날이 아래쪽(y = 36).
 */
export const KNIFE_W = 164;
export const KNIFE_H = 44;
export const KNIFE_EDGE_Y = 36;

type Color = 'ink' | 'paper';
type Part = { d: string; fill?: Color; stroke?: Color; width?: number; sharp?: boolean };

const SPINE = 8;
/** 전체 실루엣: 윗선 일직선 → 손잡이 끝 → 손잡이 아래 → 받침 → 칼날 곡선 → 칼끝. */
const OUTLINE =
  `M3 ${SPINE} L155 ${SPINE} Q161 ${SPINE} 161 14 L161 21 Q161 28.5 153 28.5 ` +
  `L114 29.5 Q109 33 104 36 L44 36 C24 36 10 27 3 ${SPINE} Z`;

const rivet = (cx: number): Part => ({
  d: `M${cx - 2.3} 18.5 a2.3 2.3 0 1 0 4.6 0 a2.3 2.3 0 1 0 -4.6 0 Z`,
  fill: 'paper',
});

/** 그리는 순서대로. 외곽선을 맨 마지막에 그려 경계를 깔끔하게 덮는다. */
const PARTS: readonly Part[] = [
  // 칼날 (종이색)
  { d: `M3 ${SPINE} L104 ${SPINE} L104 36 L44 36 C24 36 10 27 3 ${SPINE} Z`, fill: 'paper' },
  // 칼등 쪽 먹색 띠 (끝으로 갈수록 가늘어짐)
  { d: `M3 ${SPINE} L104 ${SPINE} L104 15.5 Q50 15.5 3 ${SPINE} Z`, fill: 'ink' },
  // 칼날 반사선: 아래 곡선과 나란히
  { d: 'M60 31.5 L44 31.5 C30 31.5 20 26.5 14 18', stroke: 'ink', width: 1.6 },
  // 받침 + 손잡이 (먹)
  {
    d: `M104 ${SPINE} L155 ${SPINE} Q161 ${SPINE} 161 14 L161 21 Q161 28.5 153 28.5 L114 29.5 Q109 33 104 36 Z`,
    fill: 'ink',
  },
  // 받침과 손잡이 경계
  { d: `M114 ${SPINE + 2.5} L114 27.5`, stroke: 'paper', width: 1.4 },
  // 손잡이 윗면 하이라이트
  { d: 'M119 11.5 L152 11.5', stroke: 'paper', width: 1.2 },
  rivet(126),
  rivet(138),
  rivet(150),
  // 외곽선
  { d: OUTLINE, stroke: 'ink', width: 3.2, sharp: true }, // 칼끝은 뾰족하게
];

/** `<symbol>` 안에 넣을 SVG 마크업. 색은 CSS 변수를 따른다. */
export function knifeSvg(): string {
  const color = (c?: Color) => (c ? `var(--${c})` : 'none');
  return PARTS.map(
    (p) =>
      `<path d="${p.d}" fill="${color(p.fill)}" stroke="${color(p.stroke)}" stroke-width="${p.width ?? 0}" stroke-linecap="round" stroke-linejoin="${p.sharp ? 'miter' : 'round'}" stroke-miterlimit="10"/>`,
  ).join('');
}

let paths: Path2D[] | null = null;

/**
 * 캔버스에 칼을 그린다. (x, y)는 칼날 가운데, angle은 칼끝이 향하는 방향, length는 전체 길이.
 */
export function drawKnife(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  ink: string,
  paper: string,
): void {
  paths ??= PARTS.map((p) => new Path2D(p.d));
  const color = (k: Color) => (k === 'ink' ? ink : paper);
  c.save();
  c.translate(x, y);
  c.rotate(angle + Math.PI); // 칼끝(왼쪽)이 angle 방향을 향하도록
  c.scale(length / KNIFE_W, length / KNIFE_W);
  c.translate(-KNIFE_W / 2, -KNIFE_EDGE_Y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  PARTS.forEach((p, i) => {
    const path = paths![i]!;
    if (p.fill) {
      c.fillStyle = color(p.fill);
      c.fill(path);
    }
    if (p.stroke) {
      c.lineJoin = p.sharp ? 'miter' : 'round';
      c.miterLimit = 10;
      c.strokeStyle = color(p.stroke);
      c.lineWidth = p.width ?? 1;
      c.stroke(path);
    }
  });
  c.restore();
}
