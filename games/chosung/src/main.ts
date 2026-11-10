import { Keyboard } from '@capacitor/keyboard';
import { buzz, isApp, share } from '@tgh/ui/app';
import { loadIndex, loadPair, type DictIndex, type PairDict } from './dict';
import { BONUS_MS, Game, MAX_MS, REASON_TEXT, missedWords, shareText } from './game';
import { SPRING, flashInvert, play, reducedMotion } from './motion';
import { getBest, recordScore } from './storage';

// 앱에서는 웹 전용 머리말(포트폴리오 링크)을 숨기고 안전 영역을 띄운다
if (isApp) {
  document.documentElement.classList.add('app');
  // 핀치 확대는 막고, 노치 아래까지 그린 뒤 안전 영역만큼 띄운다
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content',
    );
  // 키보드 위 이전·다음·완료 막대는 칸이 하나뿐이라 자리만 차지한다
  void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  const root = document.documentElement;
  void Keyboard.addListener('keyboardWillShow', () => root.classList.add('kb'));
  void Keyboard.addListener('keyboardWillHide', () => root.classList.remove('kb'));
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const screens = { title: $('title'), game: $('game'), result: $('result') };
const input = $<HTMLInputElement>('input');
const pairEl = $('pair');
const timerEl = $('timer');
const timerFill = $('timer-fill');
const timerNum = $('timer-num');
const chips = $('chips');
const feedback = $('feedback');
const startBtn = $<HTMLButtonElement>('start');

let index: Promise<DictIndex> = loadIndex();
let current: { pair: string; dict: PairDict } | null = null;
let game: Game | null = null;
let nextPair: string | null = null;
let running = false;
let paused = false;
let raf = 0;
/** 결과 화면이 뜬 시각. 판 끝에 치던 Enter가 바로 재시작으로 이어지지 않게 */
let resultAt = 0;
let lastFrame = 0;
let lastWholeSec = 0;
let composing = false;
let submitAfterComposition = false;

function show(name: keyof typeof screens): void {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  window.scrollTo(0, 0);
}

async function pickPair(exclude?: string): Promise<string> {
  const { pairs } = await index;
  const pool = pairs.length > 1 ? pairs.filter((p) => p.pair !== exclude) : pairs;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (!pick) throw new Error('출제할 초성이 없어요');
  return pick.pair;
}

// ---------- 타이틀 ----------

function renderTitle(): void {
  const best = getBest();
  const el = $('title-best');
  el.hidden = best === null;
  if (best !== null) el.textContent = `최고 기록 ${best}단어`;
}

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  try {
    await startGame(await pickPair());
  } catch {
    index = loadIndex(); // 다음 시도 때 다시 받기
    const err = $('title-error');
    err.hidden = false;
    err.textContent = '사전을 불러오지 못했어요. 다시 시도해 주세요.';
  } finally {
    startBtn.disabled = false;
  }
});

// ---------- 게임 ----------

async function startGame(pair: string): Promise<void> {
  const dict = await loadPair(pair);
  current = { pair, dict };
  game = new Game(pair, dict.set);
  running = false;
  paused = false;
  $('paused').hidden = true;
  lastWholeSec = Math.ceil(game.timeLeft / 1000);

  pairEl.replaceChildren(
    ...[...pair].map((c) => {
      const s = document.createElement('span');
      s.textContent = c;
      return s;
    }),
  );
  pairEl.setAttribute('aria-label', `초성 ${pair}`);
  chips.replaceChildren();
  feedback.textContent = '';
  input.value = '';
  renderCount();
  renderTimer();
  show('game');
  input.focus();

  // 두 글자가 차례로 떨어져서 찌그러지며 착지
  pairEl.classList.remove('breathe');
  [...pairEl.children].forEach((s, i) =>
    play(
      s,
      [
        { transform: 'translateY(-60vh)' },
        { transform: 'translateY(0) scale(1.15, 0.85)', offset: 0.75 },
        { transform: 'none' },
      ],
      { duration: 450, delay: i * 120, easing: 'ease-in', fill: 'backwards' },
    ),
  );
  setTimeout(() => pairEl.classList.add('breathe'), 700);
}

function renderCount(): void {
  $('count').textContent = `${game?.found.length ?? 0}단어`;
}

function renderTimer(): void {
  if (!game) return;
  const ms = game.timeLeft;
  timerFill.style.transform = `scaleX(${ms / MAX_MS})`;
  timerNum.textContent = (ms / 1000).toFixed(1);
  timerEl.classList.toggle('danger', ms < 5000);

  // 5초 미만: 1초마다 숫자 박동, 3초 미만: 배경 반전 (초당 1회로 깜빡임 제한 준수)
  const whole = Math.ceil(ms / 1000);
  if (whole !== lastWholeSec) {
    lastWholeSec = whole;
    if (ms > 0 && ms < 5000) {
      play(timerNum, [{ transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 200 });
    }
    if (ms > 0 && ms < 3000 && !reducedMotion()) flashInvert(document.body, 150);
    if (ms > 0 && ms < 3000 && running) buzz('light');
  }
}

function frame(now: number): void {
  if (!game || !running) return;
  game.tick(now - lastFrame);
  lastFrame = now;
  renderTimer();
  if (game.over) {
    endGame();
    return;
  }
  raf = requestAnimationFrame(frame);
}

function startTimer(): void {
  if (running || paused || !game || game.over) return;
  running = true;
  lastFrame = performance.now();
  raf = requestAnimationFrame(frame);
}

// ---------- 일시정지 ----------
// 탭을 가리거나 앱을 내리면 멈춘다. 돌아오면 바로 흐르지 않고 '계속하기'를 눌러야 다시 흐른다.
// 앱에서는 그 사이 키보드가 내려가므로, 버튼을 누르는 순간 입력칸에 다시 포커스를 줘 키보드를 올린다.

function pause(): void {
  if (!running || !game || game.over) return;
  running = false;
  paused = true;
  cancelAnimationFrame(raf);
  input.blur();
  $('paused').hidden = false;
  $('resume').focus();
}

function resume(): void {
  if (!paused) return;
  paused = false;
  $('paused').hidden = true;
  startTimer();
  input.focus();
}

$('resume').addEventListener('click', resume);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

function floatText(text: string): void {
  const el = document.createElement('span');
  el.className = 'float';
  el.textContent = text;
  timerEl.append(el);
  const a = play(
    el,
    [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(10px)', opacity: 0 },
    ],
    { duration: 700, easing: 'ease-out' },
  );
  if (a) a.onfinish = () => el.remove();
  else setTimeout(() => el.remove(), 700);
}

function submit(): void {
  if (!game || game.over) return;
  const raw = input.value;
  if (!raw.trim()) return;
  startTimer();

  const before = game.timeLeft;
  const result = game.submit(raw);

  if (result.ok) {
    buzz('medium');
    input.value = '';
    feedback.textContent = '';
    renderCount();

    const chip = document.createElement('li');
    chip.textContent = result.word;
    chip.dataset.word = result.word;
    chips.prepend(chip);
    play(chip, [{ transform: 'translateY(-24px) scale(0.6)', opacity: 0 }, { transform: 'none' }], {
      duration: 320,
    });

    floatText(`+${BONUS_MS / 1000}s`);
    play(pairEl, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'none' }], {
      duration: 260,
    });
    play(
      timerFill,
      [
        { transform: `scaleX(${before / MAX_MS})` },
        { transform: `scaleX(${game.timeLeft / MAX_MS})` },
      ],
      { duration: 300 },
    );
  } else {
    // 입력은 남겨둬서 바로 고칠 수 있게
    buzz('error');
    feedback.textContent = REASON_TEXT[result.reason];
    play(
      input,
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 280, easing: 'ease-out' },
    );
    flashInvert(input);
    play(feedback, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
      duration: 200,
      easing: 'steps(8)',
    });
    if (result.penalty) floatText('−1s');
    if (result.reason === 'duplicate') {
      const chip = chips.querySelector<HTMLElement>(`[data-word="${result.word}"]`);
      if (chip) {
        play(
          chip,
          [
            { transform: 'rotate(0)' },
            { transform: 'rotate(-8deg)' },
            { transform: 'rotate(8deg)' },
            { transform: 'rotate(0)' },
          ],
          { duration: 300, easing: 'ease-in-out' },
        );
      }
    }
    renderTimer();
    if (game.over) {
      endGame();
      return;
    }
  }
  input.focus();
}

// 한글 IME: 조합 중 Enter는 조합 확정에만 쓰이고, 확정 직후에 제출한다.
// - Chrome/Firefox: 조합 중 keydown(isComposing) → compositionend
// - Safari: compositionend → keydown(keyCode 229, isComposing false)
input.addEventListener('compositionstart', () => (composing = true));
input.addEventListener('compositionend', () => {
  composing = false;
  if (submitAfterComposition) {
    submitAfterComposition = false;
    setTimeout(submit);
  }
});
input.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (e.isComposing || composing) {
    submitAfterComposition = true;
    return;
  }
  if (e.keyCode === 229) {
    setTimeout(submit);
    return;
  }
  submit();
});
input.addEventListener('input', startTimer);
$('form').addEventListener('submit', (e) => e.preventDefault());
// 버튼을 눌러도 입력칸 포커스를 뺏지 않는다. 뺏기면 모바일 키보드가 내려갔다 다시 올라온다.
// 다만 한글 조합 중이면 포커스가 빠져야 마지막 글자가 확정되므로 그때는 그대로 둔다.
$('submit').addEventListener('pointerdown', (e) => {
  if (!composing) e.preventDefault();
});
$('submit').addEventListener('click', submit);

// ---------- 결과 ----------

function endGame(): void {
  if (!game || !current) return;
  running = false;
  input.blur();
  buzz('heavy');
  const { pair, dict } = current;
  const found = game.found;
  const { best, isNew } = recordScore(pair, found.length);

  $('r-pair').textContent = pair;
  $('r-best').textContent = `최고 기록 ${best}단어`;
  const record = $('r-record');
  record.hidden = !isNew;

  const foundList = $('r-found');
  foundList.replaceChildren(
    ...found.map((w) => {
      const li = document.createElement('li');
      li.textContent = w;
      return li;
    }),
  );

  const missed = missedWords(dict.words, new Set(found));
  $('r-missed-title').hidden = missed.length === 0;
  const missedList = $('r-missed');
  missedList.replaceChildren();
  $('r-coverage').textContent = `가능한 단어 ${dict.words.length}개 중 ${found.length}개 발견`;

  show('result');
  resultAt = performance.now();

  // 반전 화면으로 세로 와이프
  play(screens.result, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
    duration: 350,
    easing: 'cubic-bezier(.7,0,.3,1)',
  });
  countUp($('r-score'), found.length, 350);
  [...foundList.children].forEach((li, i) =>
    play(
      li,
      [
        { transform: 'translateY(12px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      {
        duration: 260,
        delay: 350 + i * 30,
        fill: 'backwards',
      },
    ),
  );
  if (isNew) {
    play(
      record,
      [
        { transform: 'scale(3) rotate(-20deg)', opacity: 0 },
        { transform: 'scale(1) rotate(-6deg)', opacity: 1 },
      ],
      { duration: 300, delay: 700, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'backwards' },
    )?.finished.then(() =>
      play(
        screens.result,
        [
          { transform: 'translate(0)' },
          { transform: 'translate(-6px, 3px)' },
          { transform: 'translate(5px, -2px)' },
          { transform: 'translate(0)' },
        ],
        { duration: 200, easing: 'linear' },
      ),
    );
  }
  typeWords(missedList, missed, 900 + found.length * 30);

  // "다시하기"가 바로 시작되도록 다음 초성을 미리 받아둔다
  nextPair = null;
  pickPair(pair)
    .then((p) => {
      nextPair = p;
      return loadPair(p);
    })
    .catch(() => {});
}

function countUp(el: HTMLElement, to: number, delay: number): void {
  if (reducedMotion() || to === 0) {
    el.textContent = String(to);
    return;
  }
  el.textContent = '0';
  const duration = Math.min(800, 40 * to + 200);
  const start = performance.now() + delay;
  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / duration));
    el.textContent = String(Math.round(to * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** 놓친 단어를 한 글자씩 타자 치듯 보여준다. */
function typeWords(list: HTMLElement, words: string[], delay: number): void {
  const items = words.map((w) => {
    const li = document.createElement('li');
    li.setAttribute('aria-label', w);
    list.append(li);
    return li;
  });
  if (reducedMotion()) {
    items.forEach((li, i) => (li.textContent = words[i] ?? ''));
    return;
  }
  items.forEach((li) => (li.style.visibility = 'hidden'));
  let t = delay;
  items.forEach((li, i) => {
    const w = words[i] ?? '';
    setTimeout(() => (li.style.visibility = ''), t);
    [...w].forEach((_, k) => {
      setTimeout(() => (li.textContent = w.slice(0, k + 1)), t + k * 70);
    });
    t += w.length * 70 + 90;
  });
}

$('again').addEventListener('click', async () => {
  if (!current) return;
  await startGame(nextPair ?? (await pickPair(current.pair)));
});

$('same').addEventListener('click', () => {
  if (current) void startGame(current.pair);
});

let toastTimer = 0;
$('share').addEventListener('click', async () => {
  if (!game || !current) return;
  try {
    const outcome = await share(shareText(current.pair, game.found));
    if (outcome !== 'copied') return;
  } catch {
    return;
  }
  const toast = $('toast');
  toast.textContent = '복사됨';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500);
});

// ---------- 키보드로 시작·다시하기 ----------
// 하드웨어 키보드(iPad, PC)로 칠 때 손을 화면으로 옮기지 않아도 되게 한다.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.isComposing || e.repeat) return;
  // 버튼에 포커스가 있으면 Enter가 그 버튼을 이미 누른다
  if (e.target instanceof HTMLButtonElement) return;
  if (!screens.title.hidden && !startBtn.disabled) {
    e.preventDefault();
    startBtn.click();
  } else if (!screens.result.hidden && performance.now() - resultAt > 800) {
    e.preventDefault();
    $('again').click();
  }
});

// ---------- 시작 ----------

renderTitle();
play(
  $('title').querySelector('.logo')!,
  [
    { transform: 'scale(0.6)', opacity: 0 },
    { transform: 'none', opacity: 1 },
  ],
  { duration: 400, easing: SPRING },
);
index.catch(() => {});
