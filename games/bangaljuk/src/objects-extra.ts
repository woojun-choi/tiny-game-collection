import {
  type C,
  INK,
  LINE,
  PAPER,
  TAU,
  band,
  bez,
  circle,
  disc,
  dots,
  ellipse,
  gleam,
  hatch,
  hole,
  ink,
  line,
  paper,
  rect,
  ring,
  roundPoly,
  scatter,
  solid,
  union,
  within,
} from './art';
import type { GameObject } from './objects';

/**
 * 추가 물체 22개. 뒤쪽 절반은 일부러 어렵게 만든 것들:
 * 무게가 한쪽으로 쏠린 것(망치, 막대사탕, 짝짝이 아령), 구멍이 있는 것(열쇠, 너트, 톱니바퀴),
 * 여러 덩어리가 붙은 것(포도, 체리, 브로콜리), 오목하게 꺾인 것(번개, 장화, 우산).
 */

// ---------- 실루엣 ----------

const bolt = solid([
  [0.05, -0.92],
  [0.48, -0.8],
  [0.14, -0.14],
  [0.55, -0.14],
  [-0.22, 0.92],
  [-0.05, 0.16],
  [-0.5, 0.16],
]);

const arrow = solid([
  [-0.95, -0.17],
  [0.25, -0.17],
  [0.25, -0.6],
  [0.95, 0],
  [0.25, 0.6],
  [0.25, 0.17],
  [-0.95, 0.17],
  [-0.78, 0],
]);

const DROP = { cy: 0.32, r: 0.62 };
const drop = (() => {
  const { cy, r } = DROP;
  const a = Math.acos(r / (0.95 + cy)); // 꼭짓점에서 원에 닿는 접선
  const p = new Path2D();
  p.moveTo(0, -0.95);
  p.arc(0, cy, r, -Math.PI / 2 + a, (3 * Math.PI) / 2 - a);
  p.closePath();
  return p;
})();

const hexagon = (r: number) =>
  solid(
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * TAU;
      return [r * Math.cos(a), r * Math.sin(a)] as const;
    }),
  );
const nut = union(hexagon(0.95), hole(0.38));

const gearOutline = solid(
  Array.from({ length: 40 }, (_, i) => {
    const tooth = Math.floor(i / 4);
    const k = i % 4;
    const a = ((tooth + [0.05, 0.25, 0.55, 0.75][k]!) / 10) * TAU;
    const r = k === 1 || k === 2 ? 0.95 : 0.74;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  }),
);
const gear = union(gearOutline, hole(0.24));

const KEY = { cx: -0.55, r: 0.4, hole: 0.16 };
const key = union(
  circle(KEY.r, KEY.cx),
  hole(KEY.hole, KEY.cx - 0.05),
  rect(-0.25, -0.08, 1.18, 0.16),
  rect(0.48, 0.06, 0.13, 0.2),
  rect(0.72, 0.06, 0.16, 0.25),
);

const mushroomCap = (() => {
  const p = new Path2D();
  p.moveTo(-0.95, -0.1);
  p.ellipse(0, -0.1, 0.95, 0.82, 0, Math.PI, TAU);
  p.quadraticCurveTo(0, 0.14, -0.95, -0.1);
  p.closePath();
  return p;
})();
const mushroom = union(mushroomCap, rect(-0.27, -0.2, 0.54, 1.1, 0.12));

const canopy = (() => {
  const p = new Path2D();
  p.moveTo(-0.95, -0.1);
  p.ellipse(0, -0.1, 0.95, 0.72, 0, Math.PI, TAU);
  const s = 0.95 / 2;
  for (let i = 0; i < 4; i++) {
    const cx = 0.95 - s / 2 - i * s;
    p.arc(cx, -0.1, s / 2, 0, -Math.PI, true);
  }
  p.closePath();
  return p;
})();
const UMB_HOOK = { cx: -0.16, cy: 0.6, ro: 0.2, ri: 0.12 };
const umbrella = (() => {
  const { cx, cy, ro, ri } = UMB_HOOK;
  const hook = new Path2D();
  hook.arc(cx, cy, ro, 0, Math.PI);
  hook.arc(cx - (ro + ri) / 2, cy, (ro - ri) / 2, Math.PI, 0, true);
  hook.arc(cx, cy, ri, Math.PI, 0, true);
  hook.closePath();
  return union(canopy, rect(-0.04, -0.3, 0.08, 0.92), rect(-0.035, -0.95, 0.07, 0.2), hook);
})();

const boot = (() => {
  const p = new Path2D();
  p.moveTo(-0.5, -0.8);
  p.lineTo(0.06, -0.8);
  p.lineTo(0.06, 0.16);
  p.quadraticCurveTo(0.72, 0.18, 0.74, 0.5);
  p.lineTo(0.74, 0.62);
  p.lineTo(-0.5, 0.62);
  p.closePath();
  return p;
})();

const DUMB = { l: [-0.6, 0.37] as const, r: [0.68, 0.25] as const };
const dumbbell = union(
  circle(DUMB.l[1], DUMB.l[0]),
  circle(DUMB.r[1], DUMB.r[0]),
  rect(-0.3, -0.07, 0.8, 0.14),
);

const hammerHead = solid([
  [0.42, -0.5],
  [0.78, -0.5],
  [0.78, 0.18],
  [0.66, 0.55],
  [0.42, 0.55],
]);
const hammer = union(rect(-0.95, -0.08, 1.42, 0.16, 0.06), hammerHead);

const GUITAR = { lower: [-0.5, 0.45] as const, upper: [-0.03, 0.34] as const };
const guitar = union(
  circle(GUITAR.lower[1], GUITAR.lower[0]),
  circle(GUITAR.upper[1], GUITAR.upper[0]),
  rect(0.2, -0.065, 0.6, 0.13),
  rect(0.76, -0.14, 0.19, 0.28, 0.04),
);

const CHERRY = [
  [-0.42, 0.42, 0.34],
  [0.36, 0.5, 0.31],
] as const;
const cherryStems = [
  bez([-0.4, 0.12], [-0.3, -0.5], [0.06, -0.84]),
  bez([0.34, 0.22], [0.25, -0.4], [0.06, -0.84]),
];
const cherries = union(
  ...CHERRY.map(([x, y, r]) => circle(r, x, y)),
  ...cherryStems.map((s) => band(s, 0.07)),
  ellipse(0.32, -0.74, 0.22, 0.09, -0.35),
);

const GRAPES = [
  [-0.57, -0.42],
  [-0.19, -0.42],
  [0.19, -0.42],
  [0.57, -0.42],
  [-0.38, -0.08],
  [0, -0.08],
  [0.38, -0.08],
  [-0.19, 0.26],
  [0.19, 0.26],
  [0, 0.6],
] as const;
const GRAPE_R = 0.2;
const grapeLeaf = ellipse(0.3, -0.76, 0.2, 0.1, -0.4);
const grapes = union(
  ...GRAPES.map(([x, y]) => circle(GRAPE_R, x, y)),
  band(bez([0, -0.55], [0, -0.75], [0.1, -0.92], 6), 0.08),
  grapeLeaf,
);

const pearBody = (() => {
  // 살짝 기울어진 배
  const pts = [
    [0.02, -0.78],
    [0.34, -0.64],
    [0.36, -0.28],
    [0.66, 0.06],
    [0.66, 0.52],
    [0.32, 0.9],
    [-0.38, 0.88],
    [-0.68, 0.5],
    [-0.6, 0.04],
    [-0.3, -0.3],
    [-0.28, -0.66],
  ] as const;
  const p = new Path2D();
  const n = pts.length;
  const mid = (i: number) => {
    const a = pts[i % n]!;
    const b = pts[(i + 1) % n]!;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  };
  const s = mid(0);
  p.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) {
    const c = pts[i % n]!;
    const m = mid(i);
    p.quadraticCurveTo(c[0], c[1], m[0], m[1]);
  }
  p.closePath();
  return p;
})();
const pear = union(pearBody, band(bez([0.02, -0.6], [0, -0.8], [0.12, -0.94], 6), 0.07));

const CONE_TOP = -0.05;
const cone = solid([
  [-0.42, CONE_TOP],
  [0.42, CONE_TOP],
  [0, 0.95],
]);
const SCOOPS = [
  [0, -0.38, 0.48],
  [0.1, -0.72, 0.2],
] as const;
const icecream = union(cone, ...SCOOPS.map(([x, y, r]) => circle(r, x, y)));

const LOLLI = { cy: -0.45, r: 0.5 };
const lollipop = union(circle(LOLLI.r, 0, LOLLI.cy), rect(-0.06, -0.1, 0.12, 1.05, 0.04));

const MEAT = ellipse(-0.3, 0, 0.62, 0.5, -0.15);
const drumstick = union(
  MEAT,
  rect(0.15, -0.08, 0.62, 0.16),
  circle(0.12, 0.8, -0.1),
  circle(0.12, 0.8, 0.1),
);

const FLORETS = [
  [-0.45, -0.25, 0.38],
  [0, -0.5, 0.42],
  [0.45, -0.25, 0.38],
  [-0.2, -0.05, 0.35],
  [0.22, -0.05, 0.35],
] as const;
const floretPath = union(...FLORETS.map(([x, y, r]) => circle(r, x, y)));
const broccoli = union(
  floretPath,
  solid([
    [-0.18, 0.05],
    [0.18, 0.05],
    [0.27, 0.9],
    [-0.27, 0.9],
  ]),
);

const onigiri = roundPoly(
  [-90, 30, 150].map((d) => {
    const a = (d * Math.PI) / 180;
    return [1.28 * Math.cos(a), 1.28 * Math.sin(a) + 0.06] as const;
  }),
  0.36,
);

/** 새우튀김: 한쪽이 굵고 반대쪽으로 가늘어지며 휜 몸통 + 꼬리. */
const shrimpCenter = Array.from({ length: 33 }, (_, i) => {
  const t = -1 + i / 16;
  return [0.6 * t - 0.05, 0.28 * t * t - 0.1] as const;
});
const shrimpWidth = (u: number) => 0.56 * (1 - u) + 0.1;
const shrimpTail = solid([
  [0.48, 0.12],
  [0.86, -0.1],
  [0.95, 0.18],
  [0.84, 0.42],
]);
const shrimp = union(
  band(shrimpCenter, shrimpWidth),
  circle(0.28, shrimpCenter[0]![0], shrimpCenter[0]![1]),
  shrimpTail,
);

const SKEWER_PIECES = {
  big: [-0.72, -0.3, 0.46, 0.6] as const,
  mid: [0.02, 0, 0.25] as const,
  small: [0.36, -0.18, 0.24, 0.36] as const,
};
const skewer = union(
  solid([
    [-0.95, -0.035],
    [0.82, -0.035],
    [0.95, 0],
    [0.82, 0.035],
    [-0.95, 0.035],
  ]),
  rect(...SKEWER_PIECES.big, 0.06),
  circle(SKEWER_PIECES.mid[2], SKEWER_PIECES.mid[0], SKEWER_PIECES.mid[1]),
  rect(...SKEWER_PIECES.small, 0.05),
);

// ---------- 칠하기 ----------

function strokeIn(c: C, color: string, w: number, draw: () => void): void {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  draw();
  c.stroke();
}

type Def = Omit<GameObject, 'rule'> & { rule?: CanvasFillRule };

const DEFS: Def[] = [
  // ----- 모양 -----
  {
    id: 'bolt',
    name: '번개',
    type: 'shape',
    difficulties: ['normal', 'hard'],
    path: bolt,
    paint: (c) => {
      ink(c);
      line(
        c,
        [
          [0.12, -0.76],
          [-0.18, 0.02],
        ],
        LINE,
        PAPER,
      );
    },
  },
  {
    id: 'arrow',
    name: '화살표',
    type: 'stick',
    difficulties: ['easy', 'normal', 'hard'],
    path: arrow,
    paint: (c) => {
      paper(c);
      within(c, rect(0.25, -1, 1, 2), () => ink(c));
      for (const x of [-0.7, -0.55])
        line(c, [
          [x, -0.17],
          [x + 0.1, 0],
          [x, 0.17],
        ]);
    },
  },
  {
    id: 'drop',
    name: '물방울',
    type: 'shape',
    difficulties: ['easy', 'normal', 'hard'],
    path: drop,
    paint: (c) => {
      paper(c);
      within(c, circle(DROP.r, 0, DROP.cy + 0.36), () => hatch(c, 0.11, 0, LINE * 0.6));
      gleam(c, -0.42, 0.0, 0.3);
    },
  },
  {
    id: 'nut',
    name: '너트',
    type: 'shape',
    difficulties: ['normal', 'hard'],
    path: nut,
    paint: (c) => {
      ink(c);
      ring(c, 0.5, 0, 0, LINE);
      c.strokeStyle = PAPER;
      c.lineWidth = LINE;
      c.beginPath();
      c.arc(0, 0, 0.5, 0, TAU);
      c.stroke();
      gleam(c, -0.62, -0.5, 0.3, PAPER);
    },
  },
  {
    id: 'gear',
    name: '톱니바퀴',
    type: 'shape',
    difficulties: ['hard'],
    path: gear,
    paint: (c) => {
      paper(c);
      ring(c, 0.56);
      within(c, union(circle(0.56), hole(0.36)), () => hatch(c, 0.09, -Math.PI / 4, LINE * 0.6));
      ring(c, 0.36);
    },
  },
  {
    id: 'key',
    name: '열쇠',
    type: 'stick',
    difficulties: ['normal', 'hard'],
    path: key,
    paint: (c) => {
      paper(c);
      ring(c, 0.27, KEY.cx - 0.05);
      within(c, rect(-0.2, -1, 1.2, 2), () => {
        c.fillStyle = INK;
        c.fillRect(-0.2, -0.02, 1.2, 0.04);
      });
      gleam(c, -0.88, -0.32, 0.25);
    },
  },
  {
    id: 'umbrella',
    name: '우산',
    type: 'shape',
    difficulties: ['hard'],
    path: umbrella,
    paint: (c) => {
      paper(c);
      within(c, canopy, () => {
        c.fillStyle = INK;
        for (const [a, b] of [
          [-0.95, -0.475],
          [0, 0.475],
        ] as const) {
          c.beginPath();
          c.moveTo(0, -0.86);
          c.lineTo(a * 1.2, 0.1);
          c.lineTo(b * 1.2, 0.1);
          c.closePath();
          c.fill();
        }
      });
    },
  },
  {
    id: 'boot',
    name: '장화',
    type: 'shape',
    difficulties: ['normal', 'hard'],
    path: boot,
    paint: (c) => {
      paper(c);
      c.fillStyle = INK;
      c.fillRect(-1, 0.46, 2, 1);
      c.fillRect(-1, -1, 2, 0.36);
      line(c, [
        [-0.32, -0.5],
        [-0.32, 0.3],
      ]);
      for (const x of [-0.3, 0, 0.3, 0.6])
        line(
          c,
          [
            [x, 0.46],
            [x + 0.08, 0.62],
          ],
          LINE,
          PAPER,
        );
    },
  },
  {
    id: 'guitar',
    name: '기타',
    type: 'shape',
    difficulties: ['hard'],
    path: guitar,
    paint: (c) => {
      paper(c);
      ring(c, GUITAR.lower[1] - 0.09, GUITAR.lower[0]);
      disc(c, 0.14, -0.2, 0);
      c.fillStyle = INK;
      c.fillRect(-0.62, -0.13, 0.08, 0.26);
      c.fillRect(0.76, -1, 0.3, 2);
      for (const y of [-0.035, 0.035])
        line(
          c,
          [
            [-0.58, y],
            [0.76, y],
          ],
          0.015,
        );
      for (const x of [0.36, 0.5, 0.63])
        line(
          c,
          [
            [x, -0.065],
            [x, 0.065],
          ],
          0.02,
        );
    },
  },

  // ----- 막대 -----
  {
    id: 'dumbbell',
    name: '짝짝이 아령',
    type: 'stick',
    difficulties: ['hard'],
    path: dumbbell,
    paint: (c) => {
      paper(c);
      hatch(c, 0.05, Math.PI / 2, 0.015); // 손잡이 미끄럼 방지 무늬
      disc(c, DUMB.r[1], DUMB.r[0], 0, PAPER);
      ring(c, DUMB.r[1] * 0.6, DUMB.r[0]);
      disc(c, DUMB.l[1], DUMB.l[0], 0);
      strokeIn(c, PAPER, LINE, () => c.arc(DUMB.l[0], 0, DUMB.l[1] * 0.55, 0, TAU));
      gleam(c, DUMB.l[0] - 0.28, -0.28, 0.2, PAPER);
    },
  },
  {
    id: 'hammer',
    name: '망치',
    type: 'stick',
    difficulties: ['normal', 'hard'],
    path: hammer,
    paint: (c) => {
      paper(c);
      within(c, rect(-1, -1, 0.55, 2), () => hatch(c, 0.07, Math.PI / 2, LINE * 0.6));
      within(c, hammerHead, () => {
        ink(c);
        gleam(c, 0.48, -0.42, 0.18, PAPER);
      });
    },
  },
  {
    id: 'lollipop',
    name: '막대사탕',
    type: 'stick',
    difficulties: ['normal', 'hard'],
    path: lollipop,
    paint: (c) => {
      paper(c);
      strokeIn(c, INK, LINE * 1.8, () => {
        for (let i = 0; i <= 90; i++) {
          const a = i * 0.14;
          const r = 0.02 + (a / (TAU * 2)) * 0.46;
          const x = r * Math.cos(a);
          const y = LOLLI.cy + r * Math.sin(a);
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
      });
    },
  },
  {
    id: 'skewer',
    name: '꼬치',
    type: 'stick',
    difficulties: ['hard'],
    path: skewer,
    paint: (c) => {
      paper(c);
      const [bx, by, bw, bh] = SKEWER_PIECES.big;
      c.fillStyle = INK;
      c.fillRect(bx, by, bw, bh);
      for (let i = 1; i < 4; i++)
        line(
          c,
          [
            [bx + (bw * i) / 4 - 0.05, by + 0.1],
            [bx + (bw * i) / 4 + 0.05, by + bh - 0.1],
          ],
          LINE,
          PAPER,
        );
      const [mx, my, mr] = SKEWER_PIECES.mid;
      within(c, circle(mr, mx, my), () => dots(c, 0.1, 0.02));
      const [sx, sy, sw, sh] = SKEWER_PIECES.small;
      within(c, rect(sx, sy, sw, sh), () => hatch(c, 0.08, -Math.PI / 4, LINE * 0.6));
    },
  },

  // ----- 음식 -----
  {
    id: 'mushroom',
    name: '버섯',
    type: 'food',
    difficulties: ['easy', 'normal', 'hard'],
    path: mushroom,
    paint: (c) => {
      paper(c);
      within(c, mushroomCap, () => {
        ink(c);
        for (const [x, y, r] of [
          [-0.5, -0.4, 0.13],
          [0.05, -0.62, 0.11],
          [0.52, -0.36, 0.14],
          [-0.12, -0.25, 0.08],
          [0.25, -0.15, 0.06],
        ] as const)
          disc(c, r, x, y, PAPER);
      });
      line(c, [
        [-0.08, 0.3],
        [-0.06, 0.7],
      ]);
    },
  },
  {
    id: 'cherries',
    name: '체리',
    type: 'food',
    difficulties: ['hard'],
    path: cherries,
    paint: (c) => {
      paper(c);
      for (const [x, y, r] of CHERRY) {
        disc(c, r, x, y);
        gleam(c, x - r * 0.62, y - r * 0.6, r * 0.5, PAPER);
      }
      line(
        c,
        [
          [0.14, -0.78],
          [0.48, -0.7],
        ],
        0.03,
      );
    },
  },
  {
    id: 'grapes',
    name: '포도',
    type: 'food',
    difficulties: ['hard'],
    path: grapes,
    paint: (c) => {
      paper(c);
      for (const [x, y] of GRAPES) {
        disc(c, GRAPE_R, x, y);
        strokeIn(c, PAPER, 0.03, () => c.arc(x, y, GRAPE_R - 0.005, 0, TAU));
        gleam(c, x - 0.13, y - 0.12, 0.1, PAPER);
      }
      line(
        c,
        [
          [0.14, -0.7],
          [0.46, -0.82],
        ],
        0.03,
      );
    },
  },
  {
    id: 'pear',
    name: '배',
    type: 'food',
    difficulties: ['normal', 'hard'],
    path: pear,
    paint: (c) => {
      paper(c);
      c.fillStyle = INK;
      for (const [u, v] of scatter(26, 5)) {
        c.beginPath();
        c.arc(-0.55 + u * 1.15, -0.4 + v * 1.2, 0.022, 0, TAU);
        c.fill();
      }
      gleam(c, -0.52, 0.0, 0.34);
    },
  },
  {
    id: 'icecream',
    name: '아이스크림',
    type: 'food',
    difficulties: ['normal', 'hard'],
    path: icecream,
    paint: (c) => {
      paper(c);
      within(c, cone, () => {
        hatch(c, 0.14, Math.PI / 4, LINE * 0.7);
        hatch(c, 0.14, -Math.PI / 4, LINE * 0.7);
      });
      // 콘 위로 흘러내린 크림
      c.fillStyle = PAPER;
      c.beginPath();
      c.moveTo(-0.46, CONE_TOP - 0.1);
      for (const [x, d] of [
        [-0.3, 0.14],
        [-0.1, 0.06],
        [0.1, 0.18],
        [0.3, 0.08],
        [0.46, 0],
      ] as const)
        c.quadraticCurveTo(x - 0.08, CONE_TOP + d + 0.06, x, CONE_TOP + d * 0.4);
      c.lineTo(0.5, -0.5);
      c.lineTo(-0.5, -0.5);
      c.closePath();
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = LINE;
      c.stroke();
      disc(c, SCOOPS[1][2], SCOOPS[1][0], SCOOPS[1][1]);
      gleam(c, -0.32, -0.66, 0.26);
      gleam(c, 0.0, -0.82, 0.1, PAPER);
    },
  },
  {
    id: 'drumstick',
    name: '닭다리',
    type: 'food',
    difficulties: ['hard'],
    path: drumstick,
    paint: (c) => {
      paper(c);
      within(c, MEAT, () => {
        hatch(c, 0.1, -Math.PI / 3, LINE * 0.6);
        c.fillStyle = PAPER;
        c.beginPath();
        c.ellipse(-0.42, -0.15, 0.32, 0.2, -0.3, 0, TAU);
        c.fill();
        gleam(c, -0.68, -0.32, 0.24);
      });
      strokeIn(c, INK, LINE, () => {
        c.ellipse(-0.3, 0, 0.62, 0.5, -0.15, -0.42, 0.42);
      });
    },
  },
  {
    id: 'broccoli',
    name: '브로콜리',
    type: 'food',
    difficulties: ['hard'],
    path: broccoli,
    paint: (c) => {
      paper(c);
      line(c, [
        [0, 0.15],
        [0, 0.7],
      ]);
      line(c, [
        [-0.12, 0.2],
        [-0.16, 0.55],
      ]);
      within(c, floretPath, () => {
        ink(c);
        for (const [u, v] of scatter(40, 9)) disc(c, 0.03, -0.85 + u * 1.7, -0.95 + v * 1.2, PAPER);
      });
      for (const [x, y, r] of FLORETS.slice(3))
        strokeIn(c, PAPER, 0.03, () => c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.6));
    },
  },
  {
    id: 'onigiri',
    name: '삼각김밥',
    type: 'food',
    difficulties: ['easy', 'normal'],
    path: onigiri,
    paint: (c) => {
      paper(c);
      dots(c, 0.13, 0.018);
      c.fillStyle = INK;
      c.fillRect(-0.3, 0.02, 0.6, 1);
      line(
        c,
        [
          [-0.22, 0.15],
          [0.22, 0.15],
        ],
        0.025,
        PAPER,
      );
    },
  },
  {
    id: 'shrimp',
    name: '새우튀김',
    type: 'food',
    difficulties: ['hard'],
    path: shrimp,
    paint: (c) => {
      paper(c);
      c.lineWidth = LINE * 0.7;
      c.strokeStyle = INK;
      c.lineCap = 'round';
      for (const [u, v] of scatter(70, 13)) {
        const x = -0.95 + u * 1.45;
        const y = -0.4 + v * 0.9;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 0.05, y + 0.03);
        c.stroke();
      }
      within(c, shrimpTail, () => {
        ink(c);
        line(
          c,
          [
            [0.55, 0.15],
            [0.9, 0.18],
          ],
          0.025,
          PAPER,
        );
      });
    },
  },
];

export const EXTRA_OBJECTS: GameObject[] = DEFS.map((d) => ({ rule: 'nonzero', ...d }));
