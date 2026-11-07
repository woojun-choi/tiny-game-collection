/**
 * 배너 광고. 넓은 화면은 좌우 세로 배너(160×600), 좁은 화면은 하단 고정 배너(320×50).
 * 광고 단위 ID는 빌드 환경변수로만 받는다. 값이 없으면 아무것도 그리지 않는다.
 *   VITE_ADSENSE_CLIENT, VITE_ADSENSE_SLOT_RAIL, VITE_ADSENSE_SLOT_BOTTOM
 *   VITE_ADFIT_RAIL, VITE_ADFIT_BOTTOM
 * 애드센스 값이 있으면 애드센스, 없으면 애드핏.
 * 하단 배너가 뜨면 :root에 --ad-h(배너 높이)를 두니, 화면 높이에 맞추는 레이아웃은 이 값을 빼서 쓴다.
 */

export type AdSlot = 'rail' | 'bottom';
export type AdUnit =
  { network: 'adsense'; client: string; slot: string } | { network: 'adfit'; unit: string };
type Env = Record<string, string | undefined>;

const SIZE: Record<AdSlot, [number, number]> = { rail: [160, 600], bottom: [320, 50] };
const RAIL_GAP = 24;
/** 이 크기 이상이면 좌우 배너, 아니면 하단 배너. */
export const RAIL_MIN_WIDTH = 1024;
const RAIL_MIN_HEIGHT = 640;

export function pickUnit(slot: AdSlot, env: Env): AdUnit | null {
  const key = slot.toUpperCase();
  const client = env.VITE_ADSENSE_CLIENT;
  const adsense = env[`VITE_ADSENSE_SLOT_${key}`];
  if (client && adsense) return { network: 'adsense', client, slot: adsense };
  const adfit = env[`VITE_ADFIT_${key}`];
  return adfit ? { network: 'adfit', unit: adfit } : null;
}

export function layoutFor(width: number, height: number): AdSlot {
  return width >= RAIL_MIN_WIDTH && height >= RAIL_MIN_HEIGHT ? 'rail' : 'bottom';
}

const CSS = `
.tgh-ad { position: fixed; z-index: 50; display: flex; justify-content: center; }
.tgh-ad.rail { top: 50%; transform: translateY(-50%); width: ${SIZE.rail[0]}px; height: ${SIZE.rail[1]}px; }
.tgh-ad.rail.left { left: ${RAIL_GAP}px; }
.tgh-ad.rail.right { right: ${RAIL_GAP}px; }
.tgh-ad.bottom { left: 0; right: 0; bottom: 0; height: ${SIZE.bottom[1]}px; padding-bottom: env(safe-area-inset-bottom); }
body.tgh-ads-rail { padding-inline: ${SIZE.rail[0] + RAIL_GAP * 2}px; }
:root.tgh-ads-bottom { --ad-h: calc(${SIZE.bottom[1]}px + env(safe-area-inset-bottom)); }
body.tgh-ads-bottom { padding-bottom: var(--ad-h); }
`;

function slotEl(slot: AdSlot, unit: AdUnit): HTMLElement {
  const [w, h] = SIZE[slot];
  const ins = document.createElement('ins');
  if (unit.network === 'adsense') {
    ins.className = 'adsbygoogle';
    ins.style.cssText = `display:inline-block;width:${w}px;height:${h}px`;
    ins.dataset.adClient = unit.client;
    ins.dataset.adSlot = unit.slot;
  } else {
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.dataset.adUnit = unit.unit;
    ins.dataset.adWidth = String(w);
    ins.dataset.adHeight = String(h);
  }
  return ins;
}

function loadScript(src: string, attrs: Record<string, string> = {}): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.append(s);
}

/** 페이지 로드 때 한 번 호출. 화면 너비는 이때 기준으로만 정한다. */
export function mountAds(env: Env = import.meta.env): void {
  const slot = layoutFor(innerWidth, innerHeight);
  const unit = pickUnit(slot, env);
  if (!unit) return;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  document.documentElement.classList.add(`tgh-ads-${slot}`);
  document.body.classList.add(`tgh-ads-${slot}`);

  const boxes = slot === 'rail' ? ['rail left', 'rail right'] : ['bottom'];
  for (const cls of boxes) {
    const box = document.createElement('aside');
    box.className = `tgh-ad ${cls}`;
    box.setAttribute('aria-label', '광고');
    box.append(slotEl(slot, unit));
    document.body.append(box);
  }

  if (unit.network === 'adsense') {
    loadScript(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${unit.client}`,
      { crossorigin: 'anonymous' },
    );
    const q = ((globalThis as { adsbygoogle?: unknown[] }).adsbygoogle ??= []);
    for (let i = 0; i < boxes.length; i++) q.push({});
  } else {
    loadScript('https://t1.daumcdn.net/kas/static/ba.min.js');
  }
}
