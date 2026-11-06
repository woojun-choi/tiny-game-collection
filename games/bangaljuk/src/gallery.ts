// 개발용: 모든 물체를 한 화면에 그려서 그림을 확인한다. 배포 빌드에는 포함되지 않는다.
import { drawKnife } from './knife';
import { INK, OBJECTS, PAPER } from './objects';

const grid = document.getElementById('grid')!;

/** 실루엣이 원점에서 얼마나 멀리 뻗는지 (회전해도 화면 안에 들어오려면 1 미만이어야 한다). */
function reach(path: Path2D, rule: CanvasFillRule): number {
  const n = 256;
  const k = document.createElement('canvas').getContext('2d')!;
  k.canvas.width = k.canvas.height = n;
  k.setTransform(n / 2.4, 0, 0, n / 2.4, n / 2, n / 2);
  k.fill(path, rule);
  const px = k.getImageData(0, 0, n, n).data;
  let max = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (px[(y * n + x) * 4 + 3]! > 128)
        max = Math.max(max, Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2.4));
  return max;
}
const SIZE = 160;
const dpr = window.devicePixelRatio || 1;

for (const o of OBJECTS) {
  const fig = document.createElement('figure');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE * dpr;
  const ctx = canvas.getContext('2d')!;
  const k = SIZE * dpr;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.translate(0.5, 0.5);
  ctx.scale(0.4, 0.4);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7 / (SIZE * 0.4);
  ctx.stroke(o.path);
  ctx.clip(o.path, o.rule);
  o.paint(ctx);
  fig.dataset.reach = reach(o.path, o.rule).toFixed(3);
  const cap = document.createElement('figcaption');
  cap.textContent = `${o.name} · ${o.type} · ${o.difficulties.join('/')}`;
  fig.append(canvas, cap);
  grid.append(fig);
}

// 칼
const knife = document.createElement('canvas');
knife.style.width = '480px';
knife.style.height = '140px';
knife.width = 480 * dpr;
knife.height = 140 * dpr;
const kctx = knife.getContext('2d')!;
kctx.scale(dpr * 480, dpr * 480);
drawKnife(kctx, 0.5, 0.2, Math.PI, 0.9, INK, PAPER);
document.body.prepend(knife);
