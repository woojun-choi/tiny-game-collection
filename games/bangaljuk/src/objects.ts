import type { CatalogEntry } from './rounds';
import {
  type C,
  INK,
  LINE,
  PAPER,
  TAU,
  circle,
  disc,
  dots,
  gleam,
  hatch,
  ink,
  line,
  paper,
  poly,
  ring,
  scatter,
  smoothClosed,
} from './art';
import { EXTRA_OBJECTS } from './objects-extra';

export { INK, PAPER };

/**
 * 물체 = 실루엣(측정용 Path2D) + 그림(paint).
 * 로컬 좌표는 -1~1, y는 아래로. paint는 실루엣으로 클립된 상태에서 호출되므로 마음껏 칠해도 된다.
 * 외곽선은 렌더러가 실루엣을 따라 그린다.
 *
 * 그림체: 흑백 라인 아트. 종이색 면 + 굵은 먹선, 일부는 먹으로 꽉 채우거나 빗금으로 질감을 준다.
 */
export interface GameObject extends CatalogEntry {
  name: string;
  path: Path2D;
  rule: CanvasFillRule;
  paint: (ctx: CanvasRenderingContext2D) => void;
}

// ---------- 실루엣 ----------

const star = poly(
  Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 0.42 : 0.97;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return [r * Math.cos(a), r * Math.sin(a) + 0.08] as const;
  }),
);

const heart = (() => {
  const p = new Path2D();
  p.moveTo(0, -0.45);
  p.bezierCurveTo(0, -0.95, -0.95, -0.95, -0.95, -0.35);
  p.bezierCurveTo(-0.95, 0.2, -0.3, 0.55, 0, 0.9);
  p.bezierCurveTo(0.3, 0.55, 0.95, 0.2, 0.95, -0.35);
  p.bezierCurveTo(0.95, -0.95, 0, -0.95, 0, -0.45);
  p.closePath();
  return p;
})();

const blob = smoothClosed(
  [0.98, 0.7, 0.9, 0.55, 0.95, 0.78, 0.62, 0.88].map((r, i) => {
    const a = (i / 8) * TAU;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  }),
);

/** 큰 원에서 오른쪽으로 치우친 작은 원을 뺀 초승달. 두 원의 교점에서 호를 이어 붙인다. */
const crescent = (() => {
  const [ox, R] = [-0.1, 0.97];
  const [ix, r] = [0.35, 0.8];
  const d = ix - ox;
  const x = (R * R - r * r + d * d) / (2 * d); // 바깥 원 중심 기준 교점
  const y = Math.sqrt(R * R - x * x);
  const outerA = Math.atan2(y, x);
  const innerA = Math.atan2(y, x - d);
  const p = new Path2D();
  p.arc(ox, 0, R, outerA, TAU - outerA); // 왼쪽으로 도는 바깥 호
  p.arc(ix, 0, r, -innerA, innerA, true); // 안쪽 원의 왼쪽 호로 되돌아옴
  p.closePath();
  return p;
})();

const cross = poly([
  [-0.3, -0.95],
  [0.3, -0.95],
  [0.3, -0.3],
  [0.95, -0.3],
  [0.95, 0.3],
  [0.3, 0.3],
  [0.3, 0.95],
  [-0.3, 0.95],
  [-0.3, 0.3],
  [-0.95, 0.3],
  [-0.95, -0.3],
  [-0.3, -0.3],
]);

const baguette = (() => {
  const p = new Path2D();
  p.ellipse(0, 0, 0.97, 0.24, 0, 0, TAU);
  return p;
})();

const chocoStick = (() => {
  const p = new Path2D();
  p.roundRect(-0.95, -0.075, 1.9, 0.15, 0.075);
  return p;
})();

const pencil = poly([
  [-0.95, -0.1],
  [-0.91, -0.14],
  [0.58, -0.14],
  [0.97, 0],
  [0.58, 0.14],
  [-0.91, 0.14],
  [-0.95, 0.1],
]);

/** 휘어진 소시지: 두 동심원 호 + 둥근 끝. */
const SAUSAGE = { cy: 1.07, ro: 1.45, ri: 1.05, half: 0.55 };
const sausage = (() => {
  const { cy, ro, ri, half } = SAUSAGE;
  const a1 = -Math.PI / 2 - half;
  const a2 = -Math.PI / 2 + half;
  const rc = (ro + ri) / 2;
  const cap = (ro - ri) / 2;
  const p = new Path2D();
  p.arc(0, cy, ro, a1, a2);
  p.arc(rc * Math.cos(a2), cy + rc * Math.sin(a2), cap, a2, a2 + Math.PI);
  p.arc(0, cy, ri, a2, a1, true);
  p.arc(rc * Math.cos(a1), cy + rc * Math.sin(a1), cap, a1 + Math.PI, a1 + TAU);
  p.closePath();
  return p;
})();

const cake = (() => {
  const p = new Path2D();
  p.roundRect(-0.85, -0.45, 1.7, 1.2, 0.12);
  p.arc(0, -0.58, 0.15, 0, TAU);
  return p;
})();

const sandwich = poly([
  [-0.85, -0.85],
  [0.85, 0.85],
  [-0.85, 0.85],
]);

const WM_CY = -0.45;
const watermelon = (() => {
  const p = new Path2D();
  p.arc(0, WM_CY, 0.95, 0, Math.PI);
  p.closePath();
  return p;
})();

const donut = (() => {
  const p = circle(0.95);
  p.moveTo(0.36, 0);
  p.arc(0, 0, 0.36, 0, TAU);
  return p;
})();

// ---------- 추가 음식 실루엣 ----------

const bread = (() => {
  const p = new Path2D();
  p.moveTo(-0.72, 0.88);
  p.lineTo(-0.72, -0.22);
  p.bezierCurveTo(-1.0, -0.32, -0.95, -0.95, -0.42, -0.9);
  p.bezierCurveTo(-0.2, -1.0, 0.2, -1.0, 0.42, -0.9);
  p.bezierCurveTo(0.95, -0.95, 1.0, -0.32, 0.72, -0.22);
  p.lineTo(0.72, 0.88);
  p.closePath();
  return p;
})();

/** 구멍 뚫린 치즈 조각: 쐐기 + 구멍(evenodd). 구멍 때문에 눈대중이 더 어렵다. */
const cheese = (() => {
  const p = poly([
    [-0.95, 0.5],
    [0.95, -0.5],
    [0.95, 0.5],
  ]);
  for (const [x, y, r] of [
    [0.55, 0.15, 0.14],
    [0.18, 0.3, 0.09],
    [0.75, -0.18, 0.07],
    [-0.25, 0.38, 0.06],
  ] as const) {
    p.moveTo(x + r, y);
    p.arc(x, y, r, 0, TAU);
  }
  return p;
})();

const egg = smoothClosed(
  [0.95, 0.72, 0.88, 0.7, 0.98, 0.66, 0.84, 0.76, 0.9, 0.62].map((r, i) => {
    const a = (i / 10) * TAU;
    return [r * Math.cos(a), r * 0.85 * Math.sin(a)] as const;
  }),
);

const fish = (() => {
  const p = new Path2D();
  p.ellipse(0.12, 0, 0.82, 0.42, 0, 0, TAU);
  p.moveTo(-0.55, 0);
  p.lineTo(-0.97, -0.4);
  p.quadraticCurveTo(-0.85, 0, -0.97, 0.4);
  p.closePath();
  return p;
})();

const carrot = (() => {
  const p = new Path2D();
  p.moveTo(0.97, 0);
  p.quadraticCurveTo(0.2, 0.2, -0.6, 0.18);
  p.quadraticCurveTo(-0.8, 0.17, -0.8, 0);
  p.quadraticCurveTo(-0.8, -0.17, -0.6, -0.18);
  p.quadraticCurveTo(0.2, -0.2, 0.97, 0);
  p.closePath();
  for (const [y, a] of [
    [-0.1, -0.45],
    [0, 0],
    [0.1, 0.45],
  ] as const) {
    p.moveTo(-0.78, y);
    p.ellipse(-0.88, y + Math.sin(a) * 0.06, 0.13, 0.05, a, 0, TAU);
  }
  return p;
})();

/** 바나나: 휘어진 중심선을 따라 양 끝이 가늘어지는 띠. */
const bananaCenter = (t: number) => [0.88 * t, 0.42 * t * t - 0.2] as const;
const bananaWidth = (t: number) => 0.22 * Math.pow(1 - t * t, 0.6) + 0.025;
const banana = (() => {
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const t = -1 + i / 20;
    const [x, y] = bananaCenter(t);
    const dx = 0.88;
    const dy = 0.84 * t;
    const len = Math.hypot(dx, dy);
    const [nx, ny] = [-dy / len, dx / len];
    const w = bananaWidth(t);
    top.push([x + nx * w, y + ny * w]);
    bottom.push([x - nx * w, y - ny * w]);
  }
  const p = poly([...top, ...bottom.reverse()]);
  p.rect(0.84, 0.18, 0.13, 0.08); // 꼭지
  return p;
})();
const bananaSpine = (() => {
  const p = new Path2D();
  for (let i = 0; i <= 20; i++) {
    const t = -0.7 + (i / 20) * 1.4;
    const [x, y] = bananaCenter(t);
    if (i) p.lineTo(x, y + 0.05);
    else p.moveTo(x, y + 0.05);
  }
  return p;
})();

// ---------- 비정형 생성기 ----------

type Made = { path: Path2D; rule?: CanvasFillRule; paint: (c: C) => void };

/** 점들을 원점 기준 반지름 0.97 안으로 맞춘다. */
function fit(points: [number, number][], limit = 0.97): [number, number][] {
  const max = Math.max(...points.map(([x, y]) => Math.hypot(x, y)));
  return points.map(([x, y]) => [(x / max) * limit, (y / max) * limit]);
}

/** 무늬 하나를 무작위로 고른다. */
function randomPattern(rng: () => number): (c: C) => void {
  const patterns: ((c: C) => void)[] = [
    (c) => (paper(c), gleam(c, -0.55, -0.55, 0.4)),
    (c) => (ink(c), gleam(c, -0.55, -0.55, 0.4, PAPER)),
    (c) => (paper(c), hatch(c, 0.14, rng() * Math.PI)),
    (c) => (paper(c), dots(c)),
  ];
  return patterns[Math.floor(rng() * patterns.length)]!;
}

const GENERATORS: Record<string, (rng: () => number) => Made> = {
  splat: (rng) => {
    const n = 11 + Math.floor(rng() * 4);
    const pts = fit(
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU + (rng() - 0.5) * 0.3;
        const r = 0.45 + rng() * 0.55;
        return [r * Math.cos(a), r * Math.sin(a)];
      }),
    );
    return { path: smoothClosed(pts), paint: randomPattern(rng) };
  },
  rock: (rng) => {
    const n = 7 + Math.floor(rng() * 4);
    const pts = fit(
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU + (rng() - 0.5) * 0.5;
        const r = 0.6 + rng() * 0.4;
        return [r * Math.cos(a), r * Math.sin(a)];
      }),
    );
    return { path: poly(pts), paint: randomPattern(rng) };
  },
  cloud: (rng) => {
    const k = 4 + Math.floor(rng() * 3);
    const circles = Array.from({ length: k }, () => {
      const a = rng() * TAU;
      const d = rng() * 0.5;
      return [d * Math.cos(a), d * Math.sin(a), 0.3 + rng() * 0.22] as const;
    });
    const max = Math.max(...circles.map(([x, y, r]) => Math.hypot(x, y) + r));
    const s = 0.97 / max;
    const p = new Path2D();
    for (const [x, y, r] of circles) {
      p.moveTo((x + r) * s, y * s);
      p.arc(x * s, y * s, r * s, 0, TAU);
    }
    return { path: p, paint: randomPattern(rng) };
  },
  potato: (rng) => {
    const stretch = 0.65 + rng() * 0.25;
    const pts = fit(
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * TAU;
        const r = 0.8 + rng() * 0.2;
        return [r * Math.cos(a), r * stretch * Math.sin(a)];
      }),
    );
    const eyes = Array.from({ length: 4 }, () => [
      (rng() - 0.5) * 1.1,
      (rng() - 0.5) * 0.7 * stretch,
    ]);
    return {
      path: smoothClosed(pts),
      paint: (c) => {
        paper(c);
        for (const [x, y] of eyes)
          line(c, [
            [x! - 0.06, y!],
            [x! + 0.06, y! + 0.02],
          ]);
        gleam(c, -0.6, -0.5 * stretch, 0.35);
      },
    };
  },
};

const PROCEDURAL: GameObject[] = [
  { id: 'splat', name: '얼룩', type: 'shape', difficulties: ['normal', 'hard'] },
  { id: 'rock', name: '돌멩이', type: 'shape', difficulties: ['easy', 'normal', 'hard'] },
  { id: 'cloud', name: '뭉게구름', type: 'shape', difficulties: ['normal', 'hard'] },
  { id: 'potato', name: '감자', type: 'food', difficulties: ['easy', 'normal'] },
].map((o) => ({
  ...(o as CatalogEntry & { name: string }),
  ...GENERATORS[o.id]!(Math.random),
  rule: 'nonzero',
}));

// ---------- 목록 ----------

export const OBJECTS: readonly GameObject[] = [
  // 도형 8
  {
    id: 'circle',
    name: '동그라미',
    type: 'shape',
    difficulties: ['easy', 'normal'],
    path: circle(0.95),
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      gleam(c, -0.72, -0.72, 0.5);
    },
  },
  {
    id: 'star',
    name: '별',
    type: 'shape',
    difficulties: ['easy', 'normal', 'hard'],
    path: star,
    rule: 'nonzero',
    paint: (c) => {
      ink(c);
      gleam(c, -0.28, -0.3, 0.3, PAPER);
    },
  },
  {
    id: 'heart',
    name: '하트',
    type: 'shape',
    difficulties: ['easy', 'normal', 'hard'],
    path: heart,
    rule: 'nonzero',
    paint: (c) => {
      ink(c);
      gleam(c, -0.78, -0.68, 0.4, PAPER);
    },
  },
  {
    id: 'triangle',
    name: '세모',
    type: 'shape',
    difficulties: ['easy', 'normal', 'hard'],
    path: poly([
      [0, -0.92],
      [0.95, 0.75],
      [-0.95, 0.75],
    ]),
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      hatch(c, 0.15);
    },
  },
  {
    id: 'blob',
    name: '말랑이',
    type: 'shape',
    difficulties: ['normal', 'hard'],
    path: blob,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      dots(c);
      gleam(c, -0.6, -0.62, 0.42);
    },
  },
  {
    id: 'ell',
    name: 'ㄴ자',
    type: 'shape',
    difficulties: ['normal', 'hard'],
    path: poly([
      [-0.8, -0.92],
      [-0.2, -0.92],
      [-0.2, 0.3],
      [0.8, 0.3],
      [0.8, 0.92],
      [-0.8, 0.92],
    ]),
    rule: 'nonzero',
    paint: ink,
  },
  {
    id: 'crescent',
    name: '초승달',
    type: 'shape',
    difficulties: ['normal', 'hard'],
    path: crescent,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      ring(c, 0.09, -0.78, -0.2);
      ring(c, 0.06, -0.62, 0.35);
      ring(c, 0.05, -0.85, 0.2);
    },
  },
  {
    id: 'cross',
    name: '십자',
    type: 'shape',
    difficulties: ['easy', 'normal', 'hard'],
    path: cross,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      line(c, [
        [-0.13, -0.78],
        [0.13, -0.78],
      ]);
      gleam(c, -0.22, -0.82, 0.3);
    },
  },

  // 막대 4
  {
    id: 'baguette',
    name: '바게트',
    type: 'stick',
    difficulties: ['easy', 'normal', 'hard'],
    path: baguette,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      for (let i = -2; i <= 2; i++)
        line(c, [
          [i * 0.32 - 0.1, 0.11],
          [i * 0.32 + 0.1, -0.11],
        ]);
    },
  },
  {
    id: 'choco-stick',
    name: '초코 막대',
    type: 'stick',
    difficulties: ['easy', 'normal'],
    path: chocoStick,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      c.fillStyle = INK;
      c.fillRect(-0.45, -1, 1.5, 2);
      line(
        c,
        [
          [-0.3, -0.025],
          [0.75, -0.025],
        ],
        0.025,
        PAPER,
      );
    },
  },
  {
    id: 'pencil',
    name: '연필',
    type: 'stick',
    difficulties: ['normal', 'hard'],
    path: pencil,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      line(
        c,
        [
          [-0.66, -0.045],
          [0.58, -0.045],
        ],
        0.03,
      );
      line(
        c,
        [
          [-0.66, 0.045],
          [0.58, 0.045],
        ],
        0.03,
      );
      c.save();
      c.beginPath();
      c.rect(-1, -1, 0.22, 2);
      c.clip();
      hatch(c, 0.06, -Math.PI / 4, 0.025);
      c.restore();
      c.fillStyle = INK;
      c.fillRect(-0.78, -1, 0.12, 2);
      line(
        c,
        [
          [0.58, -0.2],
          [0.58, 0.2],
        ],
        0.04,
      );
      c.fillRect(0.85, -1, 0.2, 2);
    },
  },
  {
    id: 'sausage',
    name: '소시지',
    type: 'stick',
    difficulties: ['normal', 'hard'],
    path: sausage,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      c.strokeStyle = INK;
      c.lineWidth = LINE;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(0, SAUSAGE.cy, 1.34, -Math.PI / 2 - 0.38, -Math.PI / 2 - 0.12);
      c.stroke();
      // 칼집
      for (const a of [-0.25, 0, 0.25]) {
        const t = -Math.PI / 2 + a;
        line(c, [
          [1.17 * Math.cos(t), SAUSAGE.cy + 1.17 * Math.sin(t)],
          [1.29 * Math.cos(t + 0.05), SAUSAGE.cy + 1.29 * Math.sin(t + 0.05)],
        ]);
      }
    },
  },

  // 음식 6
  {
    id: 'cake',
    name: '케이크',
    type: 'food',
    difficulties: ['easy', 'normal'],
    path: cake,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      // 크림 층
      for (const y of [0.1, 0.42]) {
        line(
          c,
          [
            [-1, y],
            [1, y],
          ],
          LINE,
        );
        c.save();
        c.beginPath();
        c.rect(-1, y + 0.03, 2, 0.08);
        c.clip();
        dots(c, 0.09, 0.016);
        c.restore();
      }
      // 먹색 프로스팅 + 흘러내림
      c.fillStyle = INK;
      c.fillRect(-1, -1, 2, 0.74);
      for (const [x, r] of [
        [-0.62, 0.09],
        [-0.22, 0.13],
        [0.2, 0.08],
        [0.6, 0.11],
      ] as const)
        disc(c, r, x, -0.26 + r * 0.4);
      // 체리
      disc(c, 0.15, 0, -0.58);
      gleam(c, -0.1, -0.68, 0.08, PAPER);
      line(c, [
        [0, -0.72],
        [0.06, -0.86],
      ]);
    },
  },
  {
    id: 'pizza',
    name: '피자',
    type: 'food',
    difficulties: ['easy', 'normal'],
    path: circle(0.95),
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      ring(c, 0.8);
      for (const [x, y] of [
        [-0.38, -0.32],
        [0.3, -0.42],
        [0.42, 0.22],
        [-0.25, 0.36],
        [0.04, -0.02],
      ] as const) {
        disc(c, 0.14, x, y);
        disc(c, 0.025, x - 0.05, y - 0.03, PAPER);
        disc(c, 0.02, x + 0.04, y + 0.04, PAPER);
      }
      for (const [x, y, a] of [
        [-0.05, -0.5, 0.4],
        [0.5, -0.05, -0.8],
        [-0.55, 0.05, 1.2],
        [0.15, 0.5, 0.2],
      ] as const) {
        c.strokeStyle = INK;
        c.lineWidth = LINE * 0.7;
        c.beginPath();
        c.ellipse(x, y, 0.09, 0.05, a, 0, TAU);
        c.stroke();
      }
    },
  },
  {
    id: 'sandwich',
    name: '샌드위치',
    type: 'food',
    difficulties: ['normal', 'hard'],
    path: sandwich,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      // 빵 테두리 안쪽 선
      line(c, [
        [-0.72, -0.5],
        [-0.72, 0.72],
        [0.5, 0.72],
      ]);
      // 빗변 쪽 단면: 상추(물결), 토마토(먹), 계란(점)
      c.save();
      c.rotate(Math.PI / 4);
      const k = Math.SQRT1_2;
      c.fillStyle = INK;
      c.fillRect(-2, 0.1 * k, 4, 0.11 * k);
      c.strokeStyle = INK;
      c.lineWidth = LINE;
      c.beginPath();
      for (let x = -1.3; x <= 1.3; x += 0.02) {
        const y = 0.04 * k + 0.035 * Math.sin(x * 22);
        if (x === -1.3) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
      c.beginPath();
      c.rect(-2, 0.24 * k, 4, 0.12 * k);
      c.clip();
      dots(c, 0.08, 0.016);
      c.restore();
    },
  },
  {
    id: 'watermelon',
    name: '수박',
    type: 'food',
    difficulties: ['easy', 'normal', 'hard'],
    path: watermelon,
    rule: 'nonzero',
    paint: (c) => {
      ink(c);
      disc(c, 0.84, 0, WM_CY, PAPER);
      ring(c, 0.76, 0, WM_CY);
      c.fillStyle = INK;
      for (const [x, y] of [
        [-0.45, -0.2],
        [-0.15, -0.05],
        [0.15, -0.05],
        [0.45, -0.2],
        [-0.3, 0.12],
        [0.3, 0.12],
        [0, 0.15],
      ] as const) {
        c.beginPath();
        c.ellipse(x, y, 0.035, 0.065, x * 0.8, 0, TAU);
        c.fill();
      }
    },
  },
  {
    id: 'sushi',
    name: '김밥',
    type: 'food',
    difficulties: ['easy', 'normal'],
    path: circle(0.92),
    rule: 'nonzero',
    paint: (c) => {
      ink(c);
      disc(c, 0.76, 0, 0, PAPER);
      c.strokeStyle = INK;
      c.lineWidth = LINE * 0.5;
      for (const [u, v] of scatter(34, 7)) {
        const a = u * TAU;
        const r = 0.38 + v * 0.32;
        c.beginPath();
        c.ellipse(r * Math.cos(a), r * Math.sin(a), 0.05, 0.025, a, 0, TAU);
        c.stroke();
      }
      disc(c, 0.15, -0.18, 0.12);
      ring(c, 0.13, 0.19, 0.14);
      c.save();
      c.beginPath();
      c.arc(0, -0.18, 0.12, 0, TAU);
      c.clip();
      hatch(c, 0.05, -Math.PI / 4, 0.02);
      c.restore();
      ring(c, 0.12, 0, -0.18);
    },
  },
  {
    id: 'donut',
    name: '도넛',
    type: 'food',
    difficulties: ['easy', 'normal', 'hard'],
    path: donut,
    rule: 'evenodd',
    paint: (c) => {
      paper(c);
      const icing = new Path2D();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * TAU;
        const r = 0.8 + 0.06 * Math.sin(a * 7);
        if (i) icing.lineTo(r * Math.cos(a), r * Math.sin(a));
        else icing.moveTo(r * Math.cos(a), r * Math.sin(a));
      }
      icing.closePath();
      icing.moveTo(0.47, 0);
      icing.arc(0, 0, 0.47, 0, TAU);
      c.fillStyle = INK;
      c.fill(icing, 'evenodd');
      c.lineWidth = 0.045;
      c.lineCap = 'round';
      c.strokeStyle = PAPER;
      for (const [u, v] of scatter(22, 3)) {
        const a = u * TAU;
        const r = 0.54 + v * 0.2;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        const t = v * TAU;
        c.beginPath();
        c.moveTo(x - 0.04 * Math.cos(t), y - 0.04 * Math.sin(t));
        c.lineTo(x + 0.04 * Math.cos(t), y + 0.04 * Math.sin(t));
        c.stroke();
      }
    },
  },

  // ---------- 음식 추가 6 ----------
  {
    id: 'bread',
    name: '식빵',
    type: 'food',
    difficulties: ['easy', 'normal', 'hard'],
    path: bread,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      c.save();
      c.scale(0.8, 0.8);
      c.translate(0, 0.05);
      c.strokeStyle = INK;
      c.lineWidth = LINE / 0.8;
      c.stroke(bread);
      c.restore();
      c.fillStyle = INK;
      for (const [u, v] of scatter(16, 11)) {
        c.beginPath();
        c.ellipse(-0.5 + u, -0.45 + v * 1.1, 0.025, 0.015, u * 3, 0, TAU);
        c.fill();
      }
    },
  },
  {
    id: 'cheese',
    name: '치즈',
    type: 'food',
    difficulties: ['normal', 'hard'],
    path: cheese,
    rule: 'evenodd',
    paint: (c) => {
      paper(c);
      hatch(c, 0.16, Math.PI / 5, LINE * 0.5);
    },
  },
  {
    id: 'egg',
    name: '계란프라이',
    type: 'food',
    difficulties: ['normal', 'hard'],
    path: egg,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      disc(c, 0.32, 0.12, -0.08);
      gleam(c, -0.08, -0.3, 0.16, PAPER);
    },
  },
  {
    id: 'fish',
    name: '생선',
    type: 'food',
    difficulties: ['easy', 'normal', 'hard'],
    path: fish,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      // 꼬리 빗금
      c.save();
      c.beginPath();
      c.rect(-1.2, -1, 0.62, 2);
      c.clip();
      hatch(c, 0.08, Math.PI / 2, LINE * 0.6);
      c.restore();
      // 비늘
      c.strokeStyle = INK;
      c.lineWidth = LINE * 0.6;
      for (let x = -0.3; x <= 0.25; x += 0.14)
        for (const y of [-0.12, 0.08]) {
          c.beginPath();
          c.arc(x, y, 0.08, -Math.PI / 2, Math.PI / 2);
          c.stroke();
        }
      line(c, [
        [0.38, -0.28],
        [0.34, 0],
        [0.38, 0.28],
      ]);
      disc(c, 0.07, 0.58, -0.08);
      disc(c, 0.022, 0.6, -0.1, PAPER);
    },
  },
  {
    id: 'carrot',
    name: '당근',
    type: 'stick',
    difficulties: ['easy', 'normal', 'hard'],
    path: carrot,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      c.fillStyle = INK;
      c.fillRect(-1.2, -1, 0.42, 2);
      for (const [x, s] of [
        [-0.45, 1],
        [-0.1, -1],
        [0.25, 1],
        [0.55, -1],
      ] as const)
        line(c, [
          [x, s * 0.13],
          [x + 0.08, s * 0.05],
        ]);
    },
  },
  {
    id: 'banana',
    name: '바나나',
    type: 'stick',
    difficulties: ['normal', 'hard'],
    path: banana,
    rule: 'nonzero',
    paint: (c) => {
      paper(c);
      c.strokeStyle = INK;
      c.lineWidth = LINE;
      c.stroke(bananaSpine);
      c.fillStyle = INK;
      c.fillRect(0.8, -1, 0.5, 2);
      c.fillRect(-1.3, -1, 0.42, 2);
    },
  },

  // ---------- 추가 물체 (objects-extra.ts) ----------
  ...EXTRA_OBJECTS,

  // ---------- 비정형 (판마다 새로 생성) ----------
  ...PROCEDURAL,
];

/** 비정형 물체의 모양과 무늬를 새로 만든다. 게임을 시작할 때마다 호출. */
export function regenerateProcedural(rng: () => number = Math.random): void {
  for (const o of PROCEDURAL) {
    const made = GENERATORS[o.id]!(rng);
    o.path = made.path;
    o.rule = made.rule ?? 'nonzero';
    o.paint = made.paint;
  }
}

export const OBJECT_BY_ID = new Map(OBJECTS.map((o) => [o.id, o]));
