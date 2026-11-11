import { generateBoard, type Board } from './board';
import { dailySeed, dayNumber, liveStreak, todayKey } from './daily';
import { loadDict, type Dict } from './dict';
import { lookup } from './meaning';
import { MAX_LEVEL, nextLevel, stage } from './stage';
import {
  CLEAR_BONUS,
  COMBO,
  GAME_MS,
  isValidLength,
  nextCombo,
  points,
  readSelection,
  rectCells,
} from './game';
import {
  hapticClear,
  hapticPress,
  hapticWord,
  hapticsOn,
  isApp,
  setHaptics,
  share,
} from './native';
import { chime, clack, setSound, soundOn, thock } from './sound';
import {
  getBest,
  getDaily,
  getStage,
  getStreak,
  hasPlayed,
  isAdFree,
  markPlayed,
  recordDaily,
  setAdFree,
  recordScore,
  recordStage,
} from './storage';

// 웹은 비영리 공개(광고 없음). 광고는 앱에서만 붙인다.
if (isApp) {
  document.documentElement.classList.add('app');
  // 앱은 스크롤을 켜 두되 핀치 확대는 막는다
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    );
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// 광고는 앱 빌드에만 있다(__ADS__). 웹 번들에는 이 import가 아예 빠진다.
const ads = __ADS__ ? import('./ads') : null;

const page = document.querySelector<HTMLElement>('.page')!;
const screens = { title: $('title'), game: $('game'), result: $('result') };
const boardEl = $('board');
const caseEl = boardEl.parentElement!;
const selEl = $('sel');
const readout = $('readout');
const scoreEl = $('score');
const timeEl = $('time');
const comboEl = $('combo');
const startBtn = $<HTMLButtonElement>('start');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

let dict: Promise<Dict> = loadDict();

type Mode = 'normal' | 'daily' | 'stage';

interface State {
  mode: Mode;
  /** 오늘의 퍼즐 날짜 */
  day: string | null;
  /** 제한 시간(ms) */
  ms: number;
  /** 단계 모드의 단계와 목표 점수. 다른 모드는 0 */
  level: number;
  target: number;
  /** 일시정지한 시각. 앱이 백그라운드로 가거나 설정을 열면 멈춘다 */
  pausedAt: number | null;
  board: Board;
  keys: HTMLElement[];
  score: number;
  found: string[];
  combo: number;
  lastClearAt: number | null;
  startedAt: number | null;
  ended: boolean;
}
let s: State | null = null;

function show(name: keyof typeof screens): void {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  page.classList.toggle('wide', name === 'game' && (s?.board.cols ?? 0) > 9);
  // 첫 화면은 한 화면에 맞춰 스크롤이 없게, 결과 화면만 길게 내려 본다
  page.classList.toggle('fit', name === 'title');
  if (name !== 'title') {
    $('how-card').hidden = true;
    $('how-open').setAttribute('aria-expanded', 'false');
  }
  void placeBanner(name);
  window.scrollTo(0, 0);
}

// ---------- 광고(앱) ----------

/** 첫 판, 오늘의 퍼즐, '오늘 하루 배너 끄기'에는 배너가 없다 */
function bannersAllowed(): boolean {
  return !!ads && hasPlayed() && s?.mode !== 'daily' && !isAdFree(todayKey());
}

/** 플레이 중 배너는 판이 줄어들지 않는 화면에서만(작은 휴대폰·작은 태블릿 가로는 뺀다) */
function boardFitsWithBanner(): boolean {
  if (!s) return false;
  const chrome = parseFloat(getComputedStyle(caseEl).getPropertyValue('--chrome')) || 300;
  const banner = innerWidth >= 700 ? 90 : 60;
  const { cols, rows } = s.board;
  const byHeight = (innerHeight - chrome - banner) * (cols / rows) * 1.02;
  return byHeight >= caseEl.parentElement!.clientWidth;
}

async function placeBanner(name: keyof typeof screens): Promise<void> {
  if (!ads) return;
  const a = await ads;
  const ok = bannersAllowed();
  $('ad-free').hidden = !(name === 'result' && ok);
  if (name === 'game' && ok && boardFitsWithBanner()) await a.showBanner('top');
  else if (name === 'result' && ok) await a.showBanner('bottom');
  else await a.hideBanner();
}

if (ads)
  void ads.then(async (a) => {
    if (await a.needsPrivacyOptions()) $('ad-privacy-row').hidden = false;
  });
$('ad-privacy').addEventListener('click', () => void ads?.then((a) => a.showPrivacyOptions()));

$('ad-free').addEventListener('click', async () => {
  if (!ads) return;
  const a = await ads;
  const r = await a.rewarded();
  if (r === 'rewarded') {
    setAdFree(todayKey());
    $('ad-free').hidden = true;
    await a.hideBanner();
    toast('오늘은 배너가 안 나와요');
  } else if (r === 'closed') toast('광고를 끝까지 보면 오늘 배너가 사라져요');
  else toast('지금은 광고가 없어요');
});

/** 보상형(힌트·+30초): 앱에서만, 오늘의 퍼즐 제외, 남은 10초 이하에서 한 판 1번 */
let rewardUsed = false;
function maybeOfferReward(secLeft: number): void {
  const box = $('reward');
  const offer = !!ads && !!s && s.mode !== 'daily' && !rewardUsed && secLeft <= 10;
  if (box.hidden === !offer) return;
  box.hidden = !offer;
}

async function useReward(kind: 'hint' | 'time'): Promise<void> {
  if (!ads || !s || rewardUsed || s.ended) return;
  rewardUsed = true;
  $('reward').hidden = true;
  pause();
  const r = await (await ads).rewarded();
  if (r !== 'rewarded') {
    // 끝까지 안 봤거나 광고가 없으면 기회를 돌려준다
    rewardUsed = false;
    resume();
    toast(r === 'closed' ? '광고를 끝까지 보면 받을 수 있어요' : '지금은 광고가 없어요');
    return;
  }
  if (kind === 'time') {
    s.ms += 30_000;
    toast('+30초');
  } else showHint();
  resume();
}
$('reward-hint').addEventListener('click', () => void useReward('hint'));
$('reward-time').addEventListener('click', () => void useReward('time'));

/** 아직 판에 그대로 남은 심은 단어 하나의 첫 글자를 깜빡인다(긴 단어 먼저) */
function showHint(): void {
  if (!s) return;
  const cells = s.board.cells;
  const left = s.board.planted
    .filter((p) => p.cells.every((i, k) => cells[i] === p.word[k]))
    .sort((a, b) => b.word.length - a.word.length);
  const pick = left[0];
  if (!pick) return toast('남은 단어가 없어요');
  const key = s.keys[pick.cells[0]!]!;
  key.classList.add('hinted');
  setTimeout(() => key.classList.remove('hinted'), 4000);
}

function toast(text: string): void {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

// ---------- 소리 ----------

const soundBtn = $('sound');
const optSound = $('opt-sound');
const optHaptics = $('opt-haptics');
function renderSound(): void {
  for (const [btn, on, label] of [
    [soundBtn, soundOn(), soundOn() ? '소리 켬' : '소리 끔'],
    [optSound, soundOn(), soundOn() ? '켬' : '끔'],
    [optHaptics, hapticsOn(), hapticsOn() ? '켬' : '끔'],
  ] as const) {
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = label;
  }
}
for (const btn of [soundBtn, optSound])
  btn.addEventListener('click', () => {
    setSound(!soundOn());
    renderSound();
  });
optHaptics.addEventListener('click', () => {
  setHaptics(!hapticsOn());
  renderSound();
  hapticPress();
});
renderSound();

// ---------- 설정·정보 ----------

const sheet = $<HTMLDialogElement>('settings');
$('app-version').textContent = __APP_VERSION__;
$('settings-open').addEventListener('click', () => {
  pause();
  sheet.showModal();
});
$('settings-close').addEventListener('click', () => sheet.close());
// 바깥(배경)을 누르면 닫기
sheet.addEventListener('click', (e) => {
  if (e.target === sheet) sheet.close();
});

// ---------- 타이틀 ----------

const dailyBtn = $<HTMLButtonElement>('daily');

function renderTitle(): void {
  $('limit').textContent = layout() === WIDE ? '2분' : '1분 30초';

  const best = getBest();
  const day = todayKey();
  const st = getStage();
  $('stage').textContent = `단계 도전 · ${st.level}단계`;
  $('title-stage').textContent = st.best ? String(st.best) : '—';
  $('daily-no').textContent = `#${dayNumber(day)}`;
  const done = getDaily(day);
  const streak = liveStreak(getStreak(), day);

  // 기록이 하나도 없으면 칸을 통째로 숨긴다
  $('title-facts').hidden = best === null && !done && !streak && !st.best;
  $('title-best').textContent = best === null ? '—' : String(best);
  $('title-daily').innerHTML = done
    ? `<span class="num">${done.score}</span><small>점</small>`
    : '아직';
  const streakEl = $('title-streak');
  streakEl.hidden = !streak;
  streakEl.textContent = `연속 ${streak}일`;
}

const howBtn = $('how-open');
const howCard = $('how-card');
function toggleHow(open = howCard.hidden): void {
  howCard.hidden = !open;
  howBtn.setAttribute('aria-expanded', String(open));
}
howBtn.addEventListener('click', () => toggleHow());
howCard.addEventListener('click', () => toggleHow(false));

async function begin(mode: Mode, btn: HTMLButtonElement): Promise<void> {
  const status = $('title-status');
  btn.disabled = true;
  status.textContent = '사전 불러오는 중…';
  try {
    startGame(await dict, mode);
    status.textContent = '';
  } catch {
    dict = loadDict();
    status.textContent = '사전을 불러오지 못했어요. 다시 시도해 주세요.';
  } finally {
    btn.disabled = false;
  }
}
startBtn.addEventListener('click', () => void begin('normal', startBtn));
dailyBtn.addEventListener('click', () => void begin('daily', dailyBtn));
const stageBtn = $<HTMLButtonElement>('stage');
stageBtn.addEventListener('click', () => void begin('stage', stageBtn));

// ---------- 게임 ----------

/** 판 크기와 제한 시간. 휴대폰(세로)은 작은 판에 짧게, 넓은 가로 화면은 큰 판에 2분 */
const PHONE = { cols: 8, rows: 11, ms: 90_000 };
const WIDE = { cols: 18, rows: 9, ms: GAME_MS };

/** 판이 시작될 때 정하고 바꾸지 않는다 */
function layout(): typeof PHONE {
  return innerWidth >= 700 && innerWidth > innerHeight ? WIDE : PHONE;
}

function startGame({ common }: Dict, mode: Mode): void {
  // 오늘의 퍼즐은 모두 같은 판이어야 하니 화면과 상관없이 휴대폰 판
  // 단계 모드도 목표 점수가 기기마다 같도록 휴대폰 판
  const day = mode === 'daily' ? todayKey() : null;
  const st = mode === 'stage' ? stage(getStage().level) : null;
  const { cols, rows } = day || st ? PHONE : layout();
  const ms = st?.ms ?? (day ? PHONE : layout()).ms;
  const seed = day ? dailySeed(day) : (Math.random() * 2 ** 32) >>> 0;
  const board = generateBoard(seed, cols, rows, common, st?.board);

  caseEl.style.setProperty('--cols', String(cols));
  caseEl.style.setProperty('--rows', String(rows));
  boardEl.replaceChildren();
  anchor = hover = tapAnchor = null;
  pressed = new Set();
  const keys = board.cells.map((ch) => {
    const el = document.createElement('div');
    el.className = 'cap';
    el.innerHTML = `<b>${ch}</b>`;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', ch ?? '빈칸');
    boardEl.append(el);
    return el;
  });

  s = {
    mode,
    day,
    ms,
    level: st?.level ?? 0,
    target: st?.target ?? 0,
    pausedAt: null,
    board,
    keys,
    score: 0,
    found: [],
    combo: 0,
    lastClearAt: null,
    startedAt: null,
    ended: false,
  };
  shownScore = 0;
  scoreEl.textContent = '0';
  timeEl.textContent = formatTime(ms);
  screens.game.classList.remove('danger');
  setCombo(0);
  setReadout('');
  $('paused').hidden = true;
  $('hint').textContent = day
    ? `오늘의 퍼즐 #${dayNumber(day)} · 첫 판만 기록돼요`
    : st
      ? `${st.level}단계 · ${st.target}점을 넘기면 다음 단계`
      : '첫 드래그부터 시간이 흘러요';
  $('stagebar').hidden = !st;
  renderStageBar();
  $('found').replaceChildren();
  $('found-count').textContent = '0';
  rewardUsed = false;
  $('reward').hidden = true;
  show('game');
}

/** 단계 모드: 목표 점수까지 얼마나 왔는지 */
function renderStageBar(): void {
  if (!s?.target) return;
  $('stage-label').textContent = `${s.level}단계 · 목표 ${s.target}`;
  $('stage-fill').style.width = `${Math.min(100, (s.score / s.target) * 100)}%`;
  $('stagebar').classList.toggle('done', s.score >= s.target);
}

function formatTime(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

let lastWholeSec = -1;
function tick(): void {
  if (!s || s.ended || s.startedAt === null || s.pausedAt !== null) return;
  const left = s.ms - (performance.now() - s.startedAt);
  if (left <= 0) return endGame();
  timeEl.textContent = formatTime(left);
  const sec = Math.ceil(left / 1000);
  maybeOfferReward(sec);
  if (sec <= 10 && sec !== lastWholeSec) {
    screens.game.classList.add('danger');
    if (!reduce.matches)
      timeEl.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'none' }],
        { duration: 300, easing: 'steps(3)' },
      );
  }
  lastWholeSec = sec;
  // 콤보가 끊기면 표시도 처음으로
  if (s.combo && s.lastClearAt !== null && performance.now() - s.lastClearAt > 3000) setCombo(0);
  requestAnimationFrame(tick);
}

function setCombo(step: number): void {
  if (s) s.combo = step;
  comboEl.dataset.step = String(step);
  $('combo-x').textContent = `×${COMBO[step]!.toFixed(1)}`;
}

/** 점수는 굴러가듯 올라간다. */
let shownScore = 0;
function rollScore(): void {
  if (!s) return;
  const target = s.score;
  const from = shownScore;
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / 400);
    shownScore = Math.round(from + (target - from) * (1 - (1 - p) ** 3));
    scoreEl.textContent = String(shownScore);
    if (p < 1 && s?.score === target) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function setReadout(text: string, live = false, extra = ''): void {
  readout.classList.toggle('live', live);
  readout.innerHTML = '';
  readout.append(text);
  if (extra) {
    const small = document.createElement('small');
    small.textContent = extra;
    readout.append(small);
  }
}

// ---------- 일시정지 ----------

/** 진행 중인 판을 멈춘다. 판을 가려서 멈춘 동안 단어를 찾지 못하게 한다. */
function pause(): void {
  if (!s || s.ended || s.startedAt === null || s.pausedAt !== null) return;
  s.pausedAt = performance.now();
  cancelDrag();
  $('paused').hidden = false;
  $('resume').focus();
}

function resume(): void {
  if (!s || s.pausedAt === null) return;
  const gap = performance.now() - s.pausedAt;
  s.startedAt! += gap;
  if (s.lastClearAt !== null) s.lastClearAt += gap;
  s.pausedAt = null;
  $('paused').hidden = true;
  requestAnimationFrame(tick);
}

$('resume').addEventListener('click', resume);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// ---------- 드래그 ----------

let anchor: number | null = null;
let hover: number | null = null;
let pressed = new Set<number>();
/** 탭 두 번으로 묶기: 키를 한 번 톡 누르면 그 키가 한쪽 꼭짓점으로 남는다. 드래그가 어려운 사람을 위한 길. */
let tapAnchor: number | null = null;
let chained = false;

/** 포인터 좌표 → 칸 번호. 판 밖이면 가장자리 칸으로 붙인다. */
function cellAt(e: PointerEvent): number {
  const b = s!.board;
  const r = boardEl.getBoundingClientRect();
  const cs = getComputedStyle(boardEl);
  const padL = parseFloat(cs.paddingLeft);
  const padT = parseFloat(cs.paddingTop);
  const gap = parseFloat(cs.columnGap) || 0;
  const pitchX = (r.width - padL * 2 + gap) / b.cols;
  const first = s!.keys[0]!.getBoundingClientRect();
  const pitchY = b.rows > 1 ? s!.keys[b.cols]!.getBoundingClientRect().top - first.top : pitchX;
  const clamp = (v: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(v)));
  const col = clamp((e.clientX - r.left - padL + gap / 2) / pitchX, b.cols);
  const row = clamp((e.clientY - r.top - padT + gap / 2) / pitchY, b.rows);
  return row * b.cols + col;
}

function updateSelection(): void {
  if (!s || anchor === null || hover === null) return;
  const rect = rectCells(anchor, hover, s.board.cols);
  const sel = readSelection(s.board.cells, rect);
  const next = new Set(sel.keys);
  // 바뀐 키만 건드린다
  for (const i of pressed) if (!next.has(i)) s.keys[i]!.classList.remove('pressed');
  for (const i of next) if (!pressed.has(i)) s.keys[i]!.classList.add('pressed');
  pressed = next;
  setReadout(sel.text, true);

  const a = s.keys[rect[0]!]!.getBoundingClientRect();
  const z = s.keys[rect.at(-1)!]!.getBoundingClientRect();
  const c = caseEl.getBoundingClientRect();
  const out = Math.max(3, a.width * 0.08);
  Object.assign(selEl.style, {
    left: `${a.left - c.left - out}px`,
    top: `${a.top - c.top - out}px`,
    width: `${z.right - a.left + out * 2}px`,
    height: `${z.bottom - a.top + out * 2 + a.width * 0.09}px`,
  });
  selEl.hidden = false;
}

function cancelDrag(): void {
  if (!s) return;
  anchor = hover = tapAnchor = null;
  selEl.hidden = true;
  for (const i of pressed) s.keys[i]!.classList.remove('pressed');
  pressed = new Set();
  setReadout('');
}

boardEl.addEventListener('pointerdown', (e) => {
  if (!s || s.ended || s.pausedAt !== null || e.button > 0) return;
  e.preventDefault();
  boardEl.setPointerCapture(e.pointerId);
  if (s.startedAt === null) {
    s.startedAt = performance.now();
    $('hint').textContent = '';
    requestAnimationFrame(tick);
  }
  hover = cellAt(e);
  chained = tapAnchor !== null;
  anchor = tapAnchor ?? hover;
  tapAnchor = null;
  updateSelection();
  thock();
  hapticPress();
});

boardEl.addEventListener('pointermove', (e) => {
  if (anchor === null || !s) return;
  const cell = cellAt(e);
  if (cell === hover) return;
  hover = cell;
  updateSelection();
});

function release(): void {
  if (!s || anchor === null || hover === null) return;
  // 키 하나만 톡 눌렀으면 눌린 채로 두고 다음 탭을 기다린다
  if (anchor === hover && !chained && s.board.cells[anchor] != null && !s.ended) {
    tapAnchor = anchor;
    anchor = hover = null;
    selEl.hidden = true;
    setReadout(s.board.cells[tapAnchor]!, true, '다른 키를 누르면 묶여요');
    return;
  }
  const sel = readSelection(s.board.cells, rectCells(anchor, hover, s.board.cols));
  anchor = hover = null;
  selEl.hidden = true;
  for (const i of pressed) s.keys[i]!.classList.remove('pressed');
  pressed = new Set();
  clack();
  if (s.ended) return;
  void dict.then(({ words }) => {
    if (isValidLength(sel.text) && words.has(sel.text)) success(sel.keys, sel.text);
    else if (sel.keys.length > 1) fail(sel.keys, sel.text);
    else setReadout('');
  });
}
boardEl.addEventListener('pointerup', release);
boardEl.addEventListener('pointercancel', release);
boardEl.addEventListener('lostpointercapture', release);

function success(keys: number[], word: string): void {
  if (!s) return;
  const now = performance.now();
  setCombo(nextCombo(s.combo, s.lastClearAt, now));
  s.lastClearAt = now;
  const gained = points(word.length, s.combo);
  s.score += gained;
  s.found.push(word);
  renderStageBar();
  for (const i of keys) s.board.cells[i] = null;

  keys.forEach((i, k) => flyOff(s!.keys[i]!, k));
  setReadout(word, false, `+${gained}`);
  if (!reduce.matches)
    readout.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], {
      duration: 260,
      easing: 'steps(3)',
    });
  chime(word.length);
  hapticWord(word.length);
  if (s.combo > 0) {
    boardEl.classList.add('flash');
    setTimeout(() => boardEl.classList.remove('flash'), 220);
    if (!reduce.matches)
      comboEl.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 240 });
  }

  const li = document.createElement('li');
  li.textContent = word;
  $('found').prepend(li);
  $('found-count').textContent = String(s.found.length);

  if (s.board.cells.every((c) => c === null)) {
    s.score += CLEAR_BONUS;
    renderStageBar();
    hapticClear();
    toast(`판 전부 비움! +${CLEAR_BONUS}`);
    rollScore();
    setTimeout(endGame, 900);
    return;
  }
  rollScore();
}

function flyOff(el: HTMLElement, order: number): void {
  const done = () => el.classList.add('gone');
  if (reduce.matches) {
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish =
      done;
    return;
  }
  const dir = order % 2 ? 1 : -1;
  const anim = el.animate(
    [
      { transform: 'translateY(-4px) rotate(0)', opacity: 1 },
      {
        transform: `translate(${dir * (20 + Math.random() * 30)}px, -90px) rotate(${dir * (25 + Math.random() * 30)}deg) scale(.6)`,
        opacity: 0,
      },
    ],
    { duration: 480, delay: order * 40, easing: 'steps(6)', fill: 'forwards' },
  );
  anim.onfinish = () => {
    done();
    anim.cancel();
  };
}

function fail(keys: number[], text: string): void {
  if (!s) return;
  setReadout(text, true);
  if (reduce.matches) return;
  readout.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 280 },
  );
  for (const i of keys)
    s.keys[i]!.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'none' }],
      { duration: 220, easing: 'steps(2)' },
    );
}

$('stop').addEventListener('click', () => endGame());

// ---------- 결과 ----------

function endGame(): void {
  if (!s || s.ended) return;
  s.ended = true;
  anchor = hover = null;
  selEl.hidden = true;
  $('reward').hidden = true;
  renderResult();
  // 첫 판의 결과 화면까지는 광고 없이. 그다음부터 배너가 붙는다
  const first = !hasPlayed();
  show('result');
  if (first) markPlayed();
}

function renderResult(): void {
  if (!s) return;
  $('r-score').textContent = String(s.score);
  const dailyEl = $('r-daily');
  $('r-record').textContent = '신기록!';
  if (s.mode === 'stage') {
    const passed = s.score >= s.target;
    const prevBest = getStage().best;
    const next = nextLevel(s.level, s.score);
    recordStage(s.level, passed, next);
    $('r-kicker').textContent = passed ? `${s.level}단계 통과!` : `${s.level}단계`;
    $('r-best').textContent = passed
      ? s.level === MAX_LEVEL
        ? `마지막 단계 · 목표 ${s.target}점 달성`
        : `목표 ${s.target}점 달성`
      : `목표 ${s.target}점까지 ${s.target - s.score}점 남았어요`;
    $('r-record').hidden = !(passed && s.level > prevBest);
    $('r-record').textContent = '최고 단계!';
    dailyEl.hidden = true;
    $('again').textContent =
      passed && s.level < MAX_LEVEL ? `${next}단계로` : `${s.level}단계 다시`;
  } else if (s.day) {
    const { first, record, streak } = recordDaily({
      day: s.day,
      score: s.score,
      words: s.found.length,
    });
    $('r-kicker').textContent = `오늘의 퍼즐 #${dayNumber(s.day)}`;
    $('r-best').textContent = first
      ? '오늘 기록으로 남았어요'
      : `오늘 기록 ${record.score}점 (첫 판만 남아요)`;
    $('r-record').hidden = true;
    dailyEl.hidden = false;
    dailyEl.textContent = `연속 ${streak.count}일 · 최고 ${streak.best}일 · 내일 새 퍼즐`;
    $('again').textContent = '일반 게임';
  } else {
    const { best, isNew } = recordScore(s.score);
    $('r-kicker').textContent = '결과';
    $('r-best').textContent = `최고 기록 ${best}점`;
    $('r-record').hidden = !isNew;
    dailyEl.hidden = true;
    $('again').textContent = '다시하기';
  }
  $('r-count').textContent = `${s.found.length}개`;
  const longest = longestWord(s.found);
  $('r-longest').textContent = longest ?? '—';

  const groups = $('r-groups');
  groups.replaceChildren();
  for (const len of [4, 3, 2]) {
    const words = s.found.filter((w) => w.length === len);
    if (!words.length) continue;
    const box = document.createElement('div');
    box.className = 'group';
    box.innerHTML = `<h2>${len}글자 <span class="meta">${words.length}</span></h2>`;
    box.append(chipList(words));
    groups.append(box);
  }

  const found = new Set(s.found);
  const missed = s.board.planted
    .map((p) => p.word)
    .filter((w) => !found.has(w))
    .sort((a, b) => b.length - a.length || Math.random() - 0.5)
    .slice(0, 8);
  $('r-missed-box').hidden = !missed.length;
  $('r-missed').replaceChildren(...chipList(missed).children);
}

function longestWord(words: string[]): string | null {
  return words.reduce<string | null>((a, w) => (!a || w.length > a.length ? w : a), null);
}

function chipList(words: string[]): HTMLUListElement {
  const ul = document.createElement('ul');
  ul.className = 'chips';
  for (const w of words) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.word = w;
    btn.textContent = w;
    li.append(btn);
    ul.append(li);
  }
  return ul;
}

// ---------- 단어 뜻 ----------

const meaningEl = $<HTMLDialogElement>('meaning');
/** 결과 화면에 보이는 단어 순서. 이전·다음 단어로 넘길 때 쓴다 */
let meaningList: string[] = [];
let meaningAt = 0;

async function showMeaning(at: number): Promise<void> {
  meaningAt = at;
  const word = meaningList[at]!;
  $('m-word').textContent = word;
  $('m-pos').textContent = '';
  $('m-defs').replaceChildren();
  $('m-status').textContent = '뜻 찾는 중…';
  $<HTMLButtonElement>('m-prev').disabled = at === 0;
  $<HTMLButtonElement>('m-next').disabled = at === meaningList.length - 1;
  if (!meaningEl.open) meaningEl.showModal();
  try {
    const m = await lookup(word);
    if (meaningList[meaningAt] !== word) return; // 그사이 다른 단어로 넘어감
    $('m-status').textContent = m ? '' : '사전에 풀이가 없어요';
    $('m-pos').textContent = m?.pos ?? '';
    $('m-defs').replaceChildren(
      ...(m?.defs ?? []).map((d) => {
        const li = document.createElement('li');
        li.textContent = d;
        return li;
      }),
    );
  } catch {
    if (meaningList[meaningAt] === word) $('m-status').textContent = '뜻을 불러오지 못했어요';
  }
}

screens.result.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-word]');
  if (!btn) return;
  meaningList = [...screens.result.querySelectorAll<HTMLElement>('button[data-word]')].map(
    (b) => b.dataset.word!,
  );
  void showMeaning(meaningList.indexOf(btn.dataset.word!));
});
$('m-prev').addEventListener('click', () => void showMeaning(Math.max(0, meaningAt - 1)));
$('m-next').addEventListener(
  'click',
  () => void showMeaning(Math.min(meaningList.length - 1, meaningAt + 1)),
);
$('m-close').addEventListener('click', () => meaningEl.close());
meaningEl.addEventListener('click', (e) => {
  if (e.target === meaningEl) meaningEl.close();
});

$('again').addEventListener('click', async () => {
  try {
    startGame(await dict, s?.mode === 'stage' ? 'stage' : 'normal');
  } catch {
    dict = loadDict();
    toast('사전을 불러오지 못했어요');
  }
});

$('home').addEventListener('click', () => {
  renderTitle();
  show('title');
  scrollTo(0, 0);
});

$('share').addEventListener('click', async () => {
  if (!s) return;
  const longest = longestWord(s.found);
  const streak = s.day ? liveStreak(getStreak(), s.day) : 0;
  const text = [
    s.day
      ? `천지인 오늘의 퍼즐 #${dayNumber(s.day)} ⌨️ ${s.score}점 · ${s.found.length}단어`
      : s.mode === 'stage'
        ? `천지인 ${s.level}단계 ⌨️ ${s.score}점 · ${s.found.length}단어`
        : `천지인 ⌨️ ${s.score}점 · ${s.found.length}단어`,
    ...(longest ? [`최장 단어: ${longest}`] : []),
    ...(streak > 1 ? [`연속 ${streak}일째`] : []),
    'cheonjiin.uzun-choi.com',
  ].join('\n');
  try {
    if ((await share(text)) === 'copied') toast('복사됐어요');
  } catch {
    toast('공유하지 못했어요');
  }
});

renderTitle();
show('title');
