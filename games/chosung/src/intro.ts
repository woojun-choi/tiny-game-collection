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

/** 두 칸에 맞춘 격자를 그린다. 줄마다 가운데에서 몇 번째 칸 거리인지(0, 1, 2…)를 함께 돌려준다 */
function drawGrid(): [SVGLineElement, number][] {
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
  // 가운데에서 같은 거리에 있는 줄(좌우·위아래 짝)은 같은 박자에 긋는다
  const steps = lines.map(([l, d]) => [l, Math.round(d / (c / 2))] as [SVGLineElement, number]);
  steps.sort((a, b) => a[1] - b[1]);
  paper.replaceChildren(...steps.map(([l]) => l));
  return steps;
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
  removeEventListener('resize', skipAll);
  const out = reducedMotion()
    ? null
    : intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 });
  if (out) out.onfinish = () => intro.remove();
  else intro.remove();
  resolveDone();
}

function skipAll(): void {
  for (const a of running) a.finish();
}

// 연출 중 키나 탭은 건너뛰기로만 쓴다. 첫 화면의 Enter(시작)까지 가지 않게 여기서 멈춘다.
function skipKey(e: KeyboardEvent): void {
  e.stopPropagation();
  e.preventDefault();
  skipAll();
}

function start(): void {
  const lines = drawGrid();
  if (reducedMotion()) {
    finish();
    return;
  }
  addEventListener('keydown', skipKey, true);
  // 연출 중에 화면 크기가 바뀌면(회전 등) 그어 둔 격자가 어긋나므로 바로 끝낸다
  addEventListener('resize', skipAll);
  intro.addEventListener('pointerdown', skipAll, { once: true });
  // 가운데 두 칸에서 바깥으로 한 칸씩 퍼져 나간다. 세로줄은 위에서 아래로, 가로줄은 왼쪽에서 오른쪽으로만.
  // 한 번 그어진 줄은 그대로 둔다.
  running = lines.map(([l, step]) => {
    l.style.strokeDasharray = '1';
    return l.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: 420,
      delay: 150 + step * 70,
      easing: 'cubic-bezier(.25,.6,.25,1)',
      fill: 'both',
    });
  });
  Promise.all(running.map((a) => a.finished))
    .then(() => new Promise((r) => setTimeout(r, 260)))
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
