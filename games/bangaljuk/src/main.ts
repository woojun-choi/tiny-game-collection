import { shareResult } from '@tgh/ui';
import {
  MISS_REACTIONS,
  REACTIONS,
  finalResult,
  judgeCut,
  pick,
  shareText,
  type CutJudgement,
  type Grade,
} from './grading';
import { splitArea } from './measure';
import { drawKnife, knifeSvg } from './knife';
import {
  INK,
  OBJECTS,
  OBJECT_BY_ID,
  PAPER,
  regenerateProcedural,
  type GameObject,
} from './objects';
import { DIFFICULTY_LABEL, pickRounds, type Placement, type RoundSpec } from './rounds';
import { getBest, recordAverage } from './storage';


const ROUNDS = 5;
const MASK = 1024; // 측정용 실루엣 해상도
const MIN_DRAG_PX = 24;
const DROP_MS = 650;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const cutMs = () => (reduceMotion.matches ? 150 : 520);

type Pt = { x: number; y: number };
type Phase = 'idle' | 'drop' | 'aim' | 'cutting' | 'judged';
type Valid = Extract<CutJudgement, { valid: true }>;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const screens = { title: $('title'), play: $('play'), result: $('result') };
const canvas = $<HTMLCanvasElement>('canvas');
const ctx = canvas.getContext('2d')!;
const nextBtn = $<HTMLButtonElement>('next');

// ---------- 상태 ----------

let rounds: RoundSpec[] = [];
let roundIdx = 0;
let results: Valid[] = [];
let obj: GameObject | null = null;
let placement: Placement | null = null;
let mask: Uint8ClampedArray | null = null;
let phase: Phase = 'idle';
let phaseStart = 0;
let drag: { a: Pt; b: Pt; id: number } | null = null;
let cut: { a: Pt; b: Pt } | null = null;
let judgement: Valid | null = null;
let size = 1; // 캔버스 CSS 크기(px)
let looping = false;
let lastTime = 0;

function show(name: keyof typeof screens): void {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
}

function setPhase(p: Phase): void {
  phase = p;
  phaseStart = performance.now();
}

// ---------- 수학 도우미 ----------

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
function bounceOut(t: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

function unit(a: Pt, b: Pt): Pt {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/** n CSS px를 정규화 좌표 길이로. */
const px = (n: number) => n / size;

// ---------- 캔버스 ----------

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  size = rect.width;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.height = Math.round(size * dpr);
}
window.addEventListener('resize', resize);

function applyPlacement(c: CanvasRenderingContext2D, p: Placement, dy = 0): void {
  c.translate(p.x, p.y + dy);
  c.rotate(p.rot);
  c.scale(p.s * p.sx, p.s * p.sy);
}

/** 측정용 마스크: 화면과 같은 배치로 실루엣만 칠한다. */
const maskCanvas = document.createElement('canvas');
maskCanvas.width = maskCanvas.height = MASK;
const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })!;
function buildMask(o: GameObject, p: Placement): Uint8ClampedArray {
  maskCtx.setTransform(1, 0, 0, 1, 0, 0);
  maskCtx.clearRect(0, 0, MASK, MASK);
  maskCtx.setTransform(MASK, 0, 0, MASK, 0, 0);
  applyPlacement(maskCtx, p);
  maskCtx.fillStyle = '#000';
  maskCtx.fill(o.path, o.rule);
  return maskCtx.getImageData(0, 0, MASK, MASK).data;
}

/** ✦ 모양 반짝이 (네 꼭짓점이 오목하게 휜 별). */
function sparklePath(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.closePath();
}

/**
 * 외곽선을 두 배 굵기로 먼저 그리고 안쪽을 덮어 칠한다. 바깥쪽 절반만 남으므로
 * 케이크+체리처럼 겹친 도형도 안쪽 선 없이 바깥 테두리만 보인다.
 */
function drawObject(o: GameObject, p: Placement, dy = 0): void {
  ctx.save();
  applyPlacement(ctx, p, dy);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineWidth = (2 * px(4)) / (p.s * Math.sqrt(p.sx * p.sy));
  ctx.stroke(o.path);
  ctx.clip(o.path, o.rule);
  o.paint(ctx);
  ctx.restore();
}

function drawPreview(a: Pt, b: Pt): void {
  const u = unit(a, b);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = px(3);
  ctx.setLineDash([px(10), px(8)]);
  ctx.beginPath();
  ctx.moveTo(a.x - u.x * 2, a.y - u.y * 2);
  ctx.lineTo(a.x + u.x * 2, a.y + u.y * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = INK;
  for (const q of [a, b]) {
    ctx.beginPath();
    ctx.arc(q.x, q.y, px(5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 잘린 두 조각: 각자 반평면으로 클립하고 법선 방향으로 밀어내며 살짝 기울인다. */
function drawPieces(now: number): void {
  if (!obj || !placement || !cut) return;
  const t = easeOutCubic(clamp01((now - phaseStart) / cutMs()));
  const { a } = cut;
  const u = unit(cut.a, cut.b);
  const n = { x: -u.y, y: u.x };
  const along = (placement.x - a.x) * u.x + (placement.y - a.y) * u.y;
  const m = { x: a.x + u.x * along, y: a.y + u.y * along };
  const off = t * 0.045;
  const tilt = t * 0.06;

  for (const sgn of [1, -1]) {
    ctx.save();
    ctx.translate(n.x * off * sgn, n.y * off * sgn);
    ctx.translate(m.x, m.y);
    ctx.rotate(sgn * tilt);
    ctx.translate(-m.x, -m.y);

    const half = new Path2D();
    half.moveTo(a.x - u.x * 3, a.y - u.y * 3);
    half.lineTo(a.x + u.x * 3, a.y + u.y * 3);
    half.lineTo(a.x + u.x * 3 + n.x * 3 * sgn, a.y + u.y * 3 + n.y * 3 * sgn);
    half.lineTo(a.x - u.x * 3 + n.x * 3 * sgn, a.y - u.y * 3 + n.y * 3 * sgn);
    half.closePath();
    ctx.clip(half);
    drawObject(obj, placement);

    // 잘린 면 외곽선: 실루엣 안쪽만 보이게 클립한 뒤 자른 선을 그린다
    const base = ctx.getTransform();
    applyPlacement(ctx, placement);
    ctx.clip(obj.path, obj.rule);
    ctx.setTransform(base);
    ctx.strokeStyle = INK;
    ctx.lineWidth = px(8); // 클립되어 절반만 보이므로 두 배
    ctx.beginPath();
    ctx.moveTo(a.x - u.x * 3, a.y - u.y * 3);
    ctx.lineTo(a.x + u.x * 3, a.y + u.y * 3);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSlash(now: number): void {
  if (!cut || reduceMotion.matches) return;
  const t = (now - phaseStart) / 280;
  if (t >= 1) return;
  const u = unit(cut.a, cut.b);
  const { a } = cut;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x - u.x * 2, a.y - u.y * 2);
  ctx.lineTo(a.x + u.x * 2, a.y + u.y * 2);
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = INK;
  ctx.lineWidth = px(14 * (1 - t) + 3);
  ctx.stroke();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = px(5 * (1 - t) + 1);
  ctx.stroke();
  ctx.restore();
}

/** 컷 직후 칼이 선을 따라 쓱 지나간다. */
const KNIFE_MS = 320;
function drawKnifeSweep(now: number): void {
  if (!cut || !placement || reduceMotion.matches) return;
  const t = (now - phaseStart) / KNIFE_MS;
  if (t >= 1) return;
  const u = unit(cut.a, cut.b);
  const along = (placement.x - cut.a.x) * u.x + (placement.y - cut.a.y) * u.y;
  const s = along - 0.7 + easeOutCubic(t) * 1.4;
  ctx.save();
  ctx.globalAlpha = t < 0.75 ? 1 : (1 - t) / 0.25;
  drawKnife(ctx, cut.a.x + u.x * s, cut.a.y + u.y * s, Math.atan2(u.y, u.x), 0.46, INK, PAPER);
  ctx.restore();
}

// ---------- 반짝이 (S 등급) ----------

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  filled: boolean;
  age: number;
  life: number;
}
let sparkles: Sparkle[] = [];

function spawnSparkles(): void {
  if (reduceMotion.matches) return;
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 0.15 + Math.random() * 0.35;
    sparkles.push({
      x: 0.5,
      y: 0.5,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: 0.015 + Math.random() * 0.03,
      filled: Math.random() < 0.6,
      age: 0,
      life: 0.9 + Math.random() * 0.5,
    });
  }
}

function drawSparkles(dt: number): void {
  const s = dt / 1000;
  sparkles = sparkles.filter((p) => (p.age += s) < p.life);
  for (const p of sparkles) {
    const k = 1 - p.age / p.life;
    p.x += p.vx * s * k * 2;
    p.y += p.vy * s * k * 2;
    // 튀어나왔다가 줄어드는 크기
    const scale = Math.sin(Math.min(1, p.age / p.life) * Math.PI);
    sparklePath(ctx, p.x, p.y, p.r * (0.4 + scale));
    if (p.filled) {
      ctx.fillStyle = INK;
      ctx.fill();
    } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = px(2);
      ctx.stroke();
    }
  }
}

// ---------- 루프 ----------

function frame(now: number): void {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(canvas.width, 0, 0, canvas.width, 0, 0);

  if (obj && placement) {
    if (phase === 'drop') {
      const t = clamp01((now - phaseStart) / DROP_MS);
      drawObject(obj, placement, -(1 - bounceOut(t)) * 0.8);
      if (t >= 1) setPhase('aim');
    } else if (phase === 'aim') {
      drawObject(obj, placement);
      if (drag) drawPreview(drag.a, drag.b);
    } else if (phase === 'cutting' || phase === 'judged') {
      drawPieces(now);
      drawSlash(now);
      drawKnifeSweep(now);
      if (phase === 'cutting' && now - phaseStart >= cutMs()) {
        setPhase('judged');
        showJudge();
      }
    }
  }
  drawSparkles(dt);

  if (!screens.play.hidden) requestAnimationFrame(frame);
  else looping = false;
}

function ensureLoop(): void {
  if (looping) return;
  looping = true;
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

// ---------- 라운드 ----------

function startGame(): void {
  regenerateProcedural();
  rounds = pickRounds(OBJECTS);
  results = [];
  show('play');
  resize();
  startRound(0);
  ensureLoop();
}

function startRound(i: number): void {
  const spec = rounds[i];
  if (!spec) return;
  roundIdx = i;
  obj = OBJECT_BY_ID.get(spec.objectId) ?? null;
  placement = spec.placement;
  mask = obj ? buildMask(obj, placement) : null;
  cut = null;
  judgement = null;
  drag = null;

  $('round').textContent = `${i + 1}/${ROUNDS}`;
  $('progress-fill').style.width = `${(i / ROUNDS) * 100}%`;
  const badge = $('badge');
  badge.textContent = DIFFICULTY_LABEL[spec.difficulty];
  badge.dataset.level = spec.difficulty;
  $('judge').hidden = true;
  $('miss').hidden = true;
  $('reaction').textContent = '';
  nextBtn.hidden = true;
  canvas.setAttribute('aria-label', `${obj?.name ?? '물체'}. 드래그해서 반으로 자르세요.`);
  setPhase(reduceMotion.matches ? 'aim' : 'drop');
}

function toNorm(e: PointerEvent): Pt {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}

canvas.addEventListener('pointerdown', (e) => {
  if (phase === 'judged') {
    advance();
    return;
  }
  if (phase !== 'aim' && phase !== 'drop') return;
  canvas.setPointerCapture(e.pointerId);
  const p = toNorm(e);
  drag = { a: p, b: p, id: e.pointerId };
});

canvas.addEventListener('pointermove', (e) => {
  if (drag && e.pointerId === drag.id) drag.b = toNorm(e);
});

canvas.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const { a, b } = drag;
  drag = null;
  if (Math.hypot(b.x - a.x, b.y - a.y) * size < MIN_DRAG_PX) return; // 탭은 무시
  doCut(a, b);
});

canvas.addEventListener('pointercancel', () => (drag = null));

let missTimer = 0;
function showMiss(text: string): void {
  const el = $('miss');
  el.textContent = text;
  el.hidden = false;
  el.animate?.(
    [
      { transform: 'translateX(-50%) rotate(-3deg) scale(0.6)' },
      { transform: 'translateX(-50%) rotate(4deg) scale(1.1)' },
      { transform: 'translateX(-50%) rotate(-3deg) scale(1)' },
    ],
    { duration: reduceMotion.matches ? 0 : 300, easing: 'ease-out' },
  );
  clearTimeout(missTimer);
  missTimer = window.setTimeout(() => (el.hidden = true), 1400);
}

function doCut(a: Pt, b: Pt): void {
  if (!mask || phase !== 'aim') return;
  const [p, q] = splitArea(mask, MASK, a.x * MASK, a.y * MASK, b.x * MASK, b.y * MASK);
  const j = judgeCut(p, q);
  if (!j.valid) {
    showMiss(pick(MISS_REACTIONS[j.reason])); // 라운드는 소모하지 않는다
    return;
  }
  $('miss').hidden = true;
  cut = { a, b };
  judgement = j;
  results.push(j);
  setPhase('cutting');
  if (!reduceMotion.matches) {
    canvas.animate(
      [
        { transform: 'translate(0, 0)' },
        { transform: 'translate(-5px, 3px)' },
        { transform: 'translate(4px, -3px)' },
        { transform: 'translate(-2px, 1px)' },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 160, easing: 'linear' },
    );
  }
}

function setGrade(el: HTMLElement, grade: Grade): void {
  el.textContent = grade;
  el.dataset.grade = grade;
}

function stampIn(el: HTMLElement, rotate: string): void {
  if (reduceMotion.matches) return;
  el.animate(
    [
      { transform: `${rotate} scale(0)` },
      { transform: `${rotate} scale(1.35, 0.7)`, offset: 0.55 },
      { transform: `${rotate} scale(0.85, 1.15)`, offset: 0.8 },
      { transform: `${rotate} scale(1)` },
    ],
    { duration: 380, easing: 'ease-out' },
  );
}

function showJudge(): void {
  const j = judgement;
  if (!j) return;
  $('ratio').textContent = `${j.smaller.toFixed(1)} : ${j.larger.toFixed(1)}`;
  const stamp = $('stamp');
  setGrade(stamp, j.grade);
  $('judge').hidden = false;
  stampIn(stamp, 'rotate(-12deg)');
  $('reaction').textContent = pick(REACTIONS[j.grade]);
  $('next-label').textContent = roundIdx + 1 < ROUNDS ? '다음' : '결과 보기';
  $('progress-fill').style.width = `${((roundIdx + 1) / ROUNDS) * 100}%`;
  nextBtn.hidden = false;
  if (j.grade === 'S') spawnSparkles();
}

function advance(): void {
  if (phase !== 'judged') return;
  if (roundIdx + 1 < ROUNDS) startRound(roundIdx + 1);
  else showResult();
}

nextBtn.addEventListener('click', advance);
document.addEventListener('keydown', (e) => {
  if (phase === 'judged' && (e.key === 'Enter' || e.key === ' ') && e.target === document.body) {
    e.preventDefault();
    advance();
  }
});

// ---------- 결과 ----------

function showResult(): void {
  setPhase('idle');
  const grades = results.map((r) => r.grade);
  const { avg, grade } = finalResult(results.map((r) => r.error));
  const { best, isNew } = recordAverage(avg);

  const stamp = $('r-stamp');
  setGrade(stamp, grade);
  $('r-reaction').textContent = pick(REACTIONS[grade]);
  $('r-avg').textContent = avg.toFixed(1);
  $('r-grades').replaceChildren(
    ...grades.map((g) => {
      const li = document.createElement('li');
      setGrade(li, g);
      return li;
    }),
  );
  $('r-best').textContent = `최고 기록 ${best.toFixed(1)}%`;
  const record = $('r-record');
  record.hidden = !isNew;

  show('result');
  stampIn(stamp, 'rotate(-8deg)');
  if (!reduceMotion.matches) {
    [...$('r-grades').children].forEach((li, i) =>
      li.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], {
        duration: 260,
        delay: 300 + i * 90,
        easing: 'cubic-bezier(.34,1.56,.64,1)',
        fill: 'backwards',
      }),
    );
    if (isNew) {
      record.animate(
        [
          { transform: 'rotate(-20deg) scale(3)', opacity: 0 },
          { transform: 'rotate(-6deg) scale(1)', opacity: 1 },
        ],
        { duration: 300, delay: 850, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'backwards' },
      );
    }
  }

  lastShare = shareText(avg, grade, grades);
}

let lastShare = '';
let toastTimer = 0;
$('share').addEventListener('click', async () => {
  try {
    if ((await shareResult(lastShare)) !== 'copied') return;
  } catch {
    return;
  }
  const toast = $('toast');
  toast.textContent = '복사됨';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500);
});

$('again').addEventListener('click', startGame);
$('start').addEventListener('click', startGame);

// ---------- 타이틀 ----------

const best = getBest();
if (best !== null) {
  const el = $('title-best');
  el.hidden = false;
  el.textContent = `최고 기록 평균 오차 ${best.toFixed(1)}%`;
}

document.getElementById('knife')!.innerHTML = knifeSvg();
