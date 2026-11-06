/** 물체 그림에 쓰는 공통 도우미. 로컬 좌표는 -1~1, y는 아래로. */
export const INK = '#111111';
export const PAPER = '#FFFDF8';
export const TAU = Math.PI * 2;
export const LINE = 0.055; // 안쪽 디테일 선 굵기 (로컬 단위)

// ---------- 모양 도우미 ----------

export function poly(points: readonly (readonly [number, number])[]): Path2D {
  const p = new Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

export function circle(r: number, cx = 0, cy = 0): Path2D {
  const p = new Path2D();
  p.arc(cx, cy, r, 0, TAU);
  return p;
}

/** 점들을 지나는 매끈한 닫힌 곡선 (중점 사이를 2차 곡선으로). */
export function smoothClosed(points: readonly (readonly [number, number])[]): Path2D {
  const p = new Path2D();
  const n = points.length;
  const mid = (i: number) => {
    const a = points[i % n]!;
    const b = points[(i + 1) % n]!;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  };
  const start = mid(0);
  p.moveTo(start[0], start[1]);
  for (let i = 1; i <= n; i++) {
    const c = points[i % n]!;
    const m = mid(i);
    p.quadraticCurveTo(c[0], c[1], m[0], m[1]);
  }
  p.closePath();
  return p;
}

/** 고정된 의사난수 (렌더링마다 같은 무늬). */
export function scatter(n: number, seed: number): [number, number][] {
  const out: [number, number][] = [];
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < n; i++) out.push([r(), r()]);
  return out;
}

// ---------- 칠하기 도우미 ----------

export type C = CanvasRenderingContext2D;

export function paper(c: C): void {
  c.fillStyle = PAPER;
  c.fillRect(-2, -2, 4, 4);
}

export function ink(c: C): void {
  c.fillStyle = INK;
  c.fillRect(-2, -2, 4, 4);
}

export function disc(c: C, r: number, cx: number, cy: number, color = INK): void {
  c.fillStyle = color;
  c.beginPath();
  c.arc(cx, cy, r, 0, TAU);
  c.fill();
}

export function ring(c: C, r: number, cx = 0, cy = 0, w = LINE): void {
  c.strokeStyle = INK;
  c.lineWidth = w;
  c.beginPath();
  c.arc(cx, cy, r, 0, TAU);
  c.stroke();
}

export function line(
  c: C,
  pts: readonly (readonly [number, number])[],
  w = LINE,
  color = INK,
): void {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}

/** 하이라이트: 왼쪽 위에 짧은 호 두 개 (빛 반사 표시). */
export function gleam(c: C, x: number, y: number, r = 0.32, color = INK): void {
  c.strokeStyle = color;
  c.lineWidth = LINE;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(x + r, y + r, r, Math.PI * 1.08, Math.PI * 1.32);
  c.stroke();
  c.beginPath();
  c.arc(x + r, y + r, r, Math.PI * 1.42, Math.PI * 1.5);
  c.stroke();
}

/** 빗금 질감. */
export function hatch(c: C, gap = 0.13, angle = -Math.PI / 4, w = LINE * 0.7): void {
  c.save();
  c.rotate(angle);
  c.strokeStyle = INK;
  c.lineWidth = w;
  c.beginPath();
  for (let x = -2; x <= 2; x += gap) {
    c.moveTo(x, -2);
    c.lineTo(x, 2);
  }
  c.stroke();
  c.restore();
}

/** 점 질감. */
export function dots(c: C, gap = 0.16, r = 0.022): void {
  c.fillStyle = INK;
  for (let y = -1.2, row = 0; y <= 1.2; y += gap, row++)
    for (let x = -1.2 + (row % 2) * (gap / 2); x <= 1.2; x += gap) {
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
}

// ---------- 합성 실루엣 도우미 ----------
// 여러 조각을 nonzero 규칙으로 합치려면 모든 조각이 같은 방향(화면 기준 시계 방향)이어야 한다.
// 구멍은 반대 방향으로 그린다.

type Pt = readonly [number, number];

/** 화면 기준 시계 방향으로 맞춘 다각형. */
export function solid(points: readonly Pt[]): Path2D {
  let area = 0;
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length]!;
    area += x * ny - nx * y;
  });
  return poly(area >= 0 ? points : [...points].reverse());
}

/** 구멍(반시계 방향 원). */
export function hole(r: number, cx = 0, cy = 0): Path2D {
  const p = new Path2D();
  p.moveTo(cx + r, cy);
  p.arc(cx, cy, r, 0, TAU, true);
  return p;
}

export function rect(x: number, y: number, w: number, h: number, r = 0): Path2D {
  const p = new Path2D();
  if (r) p.roundRect(x, y, w, h, r);
  else p.rect(x, y, w, h);
  return p;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  p.ellipse(cx, cy, rx, ry, rot, 0, TAU);
  return p;
}

/** 조각들을 하나의 실루엣으로. */
export function union(...parts: Path2D[]): Path2D {
  const p = new Path2D();
  parts.forEach((q) => p.addPath(q));
  return p;
}

/** 2차 베지어를 점으로 나눈다. */
export function bez(a: Pt, ctrl: Pt, b: Pt, n = 16): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [
      u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1],
    ];
  });
}

/** 꺾은선을 따라가는 띠. w는 굵기(숫자 또는 0~1 진행도에 따른 함수). */
export function band(points: readonly Pt[], w: number | ((t: number) => number)): Path2D {
  const width = typeof w === 'number' ? () => w : w;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const n = points.length;
  points.forEach(([x, y], i) => {
    const [ax, ay] = points[Math.max(0, i - 1)]!;
    const [bx, by] = points[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const [nx, ny] = [-(by - ay) / len, (bx - ax) / len];
    const h = width(i / (n - 1)) / 2;
    left.push([x + nx * h, y + ny * h]);
    right.push([x - nx * h, y - ny * h]);
  });
  return solid([...left, ...right.reverse()]);
}

/** 모서리를 둥글린 다각형 (시계 방향). */
export function roundPoly(points: readonly Pt[], r: number): Path2D {
  const pts = [...points];
  let area = 0;
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length]!;
    area += x * ny - nx * y;
  });
  if (area < 0) pts.reverse();
  const p = new Path2D();
  const n = pts.length;
  const last = pts[n - 1]!;
  const first = pts[0]!;
  p.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  pts.forEach((c, i) => {
    const next = pts[(i + 1) % n]!;
    p.arcTo(c[0], c[1], next[0], next[1], r);
  });
  p.closePath();
  return p;
}

/** 실루엣 안에서만 칠하기. */
export function within(c: C, path: Path2D, draw: () => void): void {
  c.save();
  c.clip(path);
  draw();
  c.restore();
}
