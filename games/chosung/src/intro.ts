/**
 * 시작 연출: 원고지 두 칸만 있는 화면에서 격자가 슥슥 그어진 뒤 첫 화면으로 넘어간다.
 * 앱 시작 화면(격자 없는 두 칸)과 같은 크기·같은 자리에서 시작해 이어지게 보인다.
 * 첫 화면으로 넘어가면 격자는 사라진다.
 */
import { SplashScreen } from '@capacitor/splash-screen';
import { isApp } from '@tgh/ui/app';
import { reducedMotion } from './motion';

const root = document.documentElement;
const paper = document.getElementById('paper') as unknown as SVGSVGElement;
const intro = document.getElementById('intro')!;
const NS = 'http://www.w3.org/2000/svg';

/** 시작 화면 이미지는 2732 정사각을 화면에 꽉 차게 늘린다. 그 안에서 칸 한 변은 260 */
export function cellSize(): number {
  return (260 * Math.max(innerWidth, innerHeight)) / 2732;
}

/** 두 칸에 맞춘 격자를 그린다. 가운데에 가까운 줄부터 돌려준다 */
function drawGrid(): SVGLineElement[] {
  const w = innerWidth,
    h = innerHeight,
    c = cellSize();
  const cx = w / 2,
    cy = h / 2;
  const x0 = cx - c - Math.ceil((cx - c) / c) * c;
  const y0 = cy - c / 2 - Math.ceil((cy - c / 2) / c) * c;
  paper.setAttribute('viewBox', `0 0 ${w} ${h}`);
  paper.style.setProperty('--grid-w', `${Math.max(1, (8 * c) / 360)}px`);
  const lines: [SVGLineElement, number][] = [];
  const add = (x1: number, y1: number, x2: number, y2: number, dist: number) => {
    const l = document.createElementNS(NS, 'line');
    for (const [k, v] of Object.entries({ x1, y1, x2, y2 })) l.setAttribute(k, String(v));
    l.setAttribute('pathLength', '1');
    lines.push([l, dist]);
  };
  for (let x = x0; x <= w; x += c) add(x, 0, x, h, Math.abs(x - cx));
  for (let y = y0; y <= h; y += c) add(0, y, w, y, Math.abs(y - cy));
  lines.sort((a, b) => a[1] - b[1]);
  paper.replaceChildren(...lines.map(([l]) => l));
  return lines.map(([l]) => l);
}

let resolveDone!: () => void;
/** 연출이 끝나 첫 화면이 다 보이는 시점 */
export const introDone = new Promise<void>((r) => (resolveDone = r));

let running: Animation[] = [];

function finish(): void {
  for (const a of running) a.cancel();
  running = [];
  for (const l of paper.querySelectorAll('line')) l.removeAttribute('style');
  root.classList.remove('intro');
  removeEventListener('keydown', skipKey, true);
  const out = reducedMotion()
    ? null
    : intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 });
  if (out) out.onfinish = () => intro.remove();
  else intro.remove();
  resolveDone();
}

// 연출 중 키나 탭은 건너뛰기로만 쓴다. 첫 화면의 Enter(시작)까지 가지 않게 여기서 멈춘다.
function skipKey(e: KeyboardEvent): void {
  e.stopPropagation();
  e.preventDefault();
  for (const a of running) a.finish();
}

function start(): void {
  const lines = drawGrid();
  if (reducedMotion()) {
    finish();
    return;
  }
  addEventListener('keydown', skipKey, true);
  intro.addEventListener('pointerdown', () => running.forEach((a) => a.finish()), { once: true });
  // 펜으로 긋듯: 빠르게 나가다 천천히 멈춘다. 방향은 줄마다 번갈아
  running = lines.map((l, i) => {
    l.style.strokeDasharray = '1';
    const from = i % 2 ? -1 : 1;
    return l.animate([{ strokeDashoffset: from }, { strokeDashoffset: 0 }], {
      duration: 280,
      delay: 200 + i * 30,
      easing: 'cubic-bezier(.3,.7,.2,1)',
      fill: 'both',
    });
  });
  Promise.all(running.map((a) => a.finished))
    .then(() => new Promise((r) => setTimeout(r, 160)))
    .then(finish, finish);
}

// 앱: 웹이 두 칸을 그린 다음에 시작 화면을 걷어 낸다. 글꼴이 늦으면 두 칸 글자가 빈 채로 보이므로 글꼴도 기다린다.
async function boot(): Promise<void> {
  if (isApp) {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {});
  }
  start();
}

void boot();
