import { shareResult } from '@tgh/ui';
import { generateBoard, type Board } from './board';
import { loadDict, type Dict } from './dict';
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
import { chime, clack, setSound, soundOn, thock } from './sound';
import { getBest, recordScore } from './storage';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

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

interface State {
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
  window.scrollTo(0, 0);
}

function toast(text: string): void {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

// ---------- 소리 ----------

const soundBtn = $('sound');
function renderSound(): void {
  soundBtn.setAttribute('aria-pressed', String(soundOn()));
  soundBtn.textContent = soundOn() ? '소리 켬' : '소리 끔';
}
soundBtn.addEventListener('click', () => {
  setSound(!soundOn());
  renderSound();
});
renderSound();

// ---------- 타이틀 ----------

function renderTitle(): void {
  const best = getBest();
  const el = $('title-best');
  el.hidden = best === null;
  if (best !== null) el.textContent = `최고 기록 ${best}점`;
}

startBtn.addEventListener('click', async () => {
  const status = $('title-status');
  startBtn.disabled = true;
  status.textContent = '사전 불러오는 중…';
  try {
    startGame(await dict);
    status.textContent = '';
  } catch {
    dict = loadDict();
    status.textContent = '사전을 불러오지 못했어요. 다시 시도해 주세요.';
  } finally {
    startBtn.disabled = false;
  }
});

// ---------- 게임 ----------

/** 세로 화면은 9×13, 가로로 넓은 화면은 18×9. 판이 시작될 때 정하고 바꾸지 않는다. */
function gridSize(): [number, number] {
  return innerWidth >= 700 && innerWidth > innerHeight ? [18, 9] : [9, 13];
}

function startGame({ common }: Dict): void {
  const [cols, rows] = gridSize();
  const seed = (Math.random() * 2 ** 32) >>> 0;
  const board = generateBoard(seed, cols, rows, common);
  const accents = new Set(board.accents);

  caseEl.style.setProperty('--cols', String(cols));
  caseEl.style.setProperty('--rows', String(rows));
  boardEl.replaceChildren();
  const keys = board.cells.map((ch, i) => {
    const el = document.createElement('div');
    el.className = 'cap';
    if (accents.has(i)) el.classList.add('inv');
    el.innerHTML = `<b>${ch}</b>`;
    boardEl.append(el);
    return el;
  });

  s = {
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
  timeEl.textContent = formatTime(GAME_MS);
  screens.game.classList.remove('danger');
  setCombo(0);
  setReadout('');
  $('hint').textContent = '첫 드래그부터 시간이 흘러요';
  $('found').replaceChildren();
  $('found-count').textContent = '0';
  show('game');
}

function formatTime(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

let lastWholeSec = -1;
function tick(): void {
  if (!s || s.ended || s.startedAt === null) return;
  const left = GAME_MS - (performance.now() - s.startedAt);
  if (left <= 0) return endGame();
  timeEl.textContent = formatTime(left);
  const sec = Math.ceil(left / 1000);
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

// ---------- 드래그 ----------

let anchor: number | null = null;
let hover: number | null = null;
let pressed = new Set<number>();

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

boardEl.addEventListener('pointerdown', (e) => {
  if (!s || s.ended || e.button > 0) return;
  e.preventDefault();
  boardEl.setPointerCapture(e.pointerId);
  if (s.startedAt === null) {
    s.startedAt = performance.now();
    $('hint').textContent = '';
    requestAnimationFrame(tick);
  }
  anchor = hover = cellAt(e);
  updateSelection();
  thock();
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
  for (const i of keys) s.board.cells[i] = null;

  keys.forEach((i, k) => flyOff(s!.keys[i]!, k));
  setReadout(word, false, `+${gained}`);
  if (!reduce.matches)
    readout.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], {
      duration: 260,
      easing: 'steps(3)',
    });
  chime(word.length);
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
  renderResult();
  show('result');
}

function renderResult(): void {
  if (!s) return;
  const { best, isNew } = recordScore(s.score);
  $('r-score').textContent = String(s.score);
  $('r-best').textContent = `최고 기록 ${best}점`;
  $('r-record').hidden = !isNew;
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
    li.textContent = w;
    ul.append(li);
  }
  return ul;
}

$('again').addEventListener('click', async () => {
  try {
    startGame(await dict);
  } catch {
    dict = loadDict();
    toast('사전을 불러오지 못했어요');
  }
});

$('share').addEventListener('click', async () => {
  if (!s) return;
  const longest = longestWord(s.found);
  const text = [
    `천지인 ⌨️ ${s.score}점 · ${s.found.length}단어`,
    ...(longest ? [`최장 단어: ${longest}`] : []),
    'cheonjiin.uzun-choi.com',
  ].join('\n');
  try {
    if ((await shareResult(text)) === 'copied') toast('복사됐어요');
  } catch {
    toast('공유하지 못했어요');
  }
});

renderTitle();
show('title');
