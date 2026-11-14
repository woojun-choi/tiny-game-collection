import { buzz, share } from '@tgh/ui/app';
import { loadIndex, loadPair, type DictIndex, type PairDict } from './dict';
import { BONUS_MS, Game, MAX_MS, REASON_TEXT, missedWords, shareText } from './game';
import { dailyPair, dayNumber, liveStreak, todayKey } from './daily';
import { introDone } from './intro';
import { lookup, preload } from './meaning';
import { expectKeyboard } from './shell';
import { SPRING, flashInvert, play, reducedMotion } from './motion';
import { getBest, getDaily, getStreak, recordDaily, recordScore } from './storage';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// 광고는 앱 빌드에만 있다(__ADS__). 웹 번들에는 이 import가 아예 빠진다.
const ads = __ADS__ ? import('./ads') : null;
/** 광고 보고 이어하기로 받는 시간 */
const CONTINUE_MS = 15_000;
const pausedText = document.querySelector<HTMLElement>('#paused p')!;

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
/** day: 오늘의 초성으로 하는 판이면 그 날짜, 아니면 null */
let current: { pair: string; dict: PairDict; day: string | null } | null = null;
let game: Game | null = null;
let nextPair: string | null = null;
let running = false;
/** 이번 판에 광고 보고 이어하기를 이미 했는지 */
let continued = false;
/** 이번 판이 이 기기의 첫 판인지(첫 판에는 광고를 내지 않는다) */
let firstGame = false;
let paused = false;
let raf = 0;
/** 결과 화면이 뜬 시각. 판 끝에 치던 Enter가 바로 재시작으로 이어지지 않게 */
let resultAt = 0;
let lastFrame = 0;
let lastWholeSec = 0;
let composing = false;
let submitAfterComposition = false;

function show(name: keyof typeof screens): void {
  if (name !== 'result' && meaningEl.open) meaningEl.close();
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  window.scrollTo(0, 0);
  void placeBanner(name);
}

// ---------- 광고(앱) ----------

/** 첫 판과 오늘의 초성에는 광고가 없다 */
function adsAllowed(): boolean {
  return !!ads && !firstGame && !current?.day;
}

/**
 * 플레이 화면: 찾은 단어 첫 줄이 화면 안(키보드 위)에 다 보이는지.
 * 판이 막 시작될 땐 단어 칸이 비어 배치가 달라서, 보이지 않는 칩 하나를 넣고 잰다.
 */
function chipRowFits(): boolean {
  const probe = document.createElement('li');
  probe.textContent = '가나';
  probe.style.visibility = 'hidden';
  chips.prepend(probe);
  const page = document.querySelector('.page')!;
  const end =
    page.getBoundingClientRect().bottom - parseFloat(getComputedStyle(page).paddingBottom);
  const fits = probe.getBoundingClientRect().bottom <= end;
  probe.remove();
  return fits;
}

/** 위 배너를 아예 넣지 않는 화면: 작은 아이폰(SE 등). iPad 가로는 두 단 배치라 자리가 난다 */
function noTopBanner(): boolean {
  return innerHeight < 700;
}

async function placeBanner(name: keyof typeof screens): Promise<void> {
  if (!ads) return;
  const a = await ads;
  if (name === 'result' && adsAllowed()) return a.showBanner('bottom');
  // 플레이 화면 위 배너: 자리를 먼저 비워 보고, 찾은 단어가 한 줄도 안 보이면 넣지 않는다.
  // 작은 아이폰(SE 등)은 재 보지 않고 뺀다.
  if (name === 'game' && adsAllowed() && !noTopBanner()) {
    a.setSpace('top', a.bannerHeight());
    if (chipRowFits()) return a.showBanner('top');
  }
  await a.hideBanner();
  a.setSpace(null, 0);
}

if (ads)
  void ads.then(async (a) => {
    if (await a.needsPrivacyOptions()) $('ad-privacy-row').hidden = false;
  });
$('ad-privacy').addEventListener('click', () => void ads?.then((a) => a.showPrivacyOptions()));

/** 시간이 다 됐을 때: 앱이면 한 판에 한 번 '광고 보고 이어하기'를 묻고, 아니면 바로 결과 */
function timeUp(): void {
  if (!game || !adsAllowed() || continued) {
    endGame();
    return;
  }
  running = false;
  cancelAnimationFrame(raf);
  input.blur();
  $('continue').hidden = false;
  $('continue-ad').focus();
}

$('continue-no').addEventListener('click', () => {
  $('continue').hidden = true;
  endGame();
});

const continueAd = $<HTMLButtonElement>('continue-ad');
continueAd.addEventListener('click', async () => {
  if (!ads || !game || continued) return;
  continueAd.disabled = true;
  const r = await (await ads).rewarded();
  continueAd.disabled = false;
  if (r !== 'rewarded') {
    showToast(r === 'closed' ? '광고를 끝까지 보면 이어할 수 있어요' : '지금은 광고가 없어요');
    return;
  }
  continued = true;
  game.timeLeft = CONTINUE_MS;
  lastWholeSec = Math.ceil(game.timeLeft / 1000);
  renderTimer();
  $('continue').hidden = true;
  // 바로 흐르지 않고 '계속하기'를 눌러야 다시 흐른다. 누르는 순간 키보드도 다시 올라온다.
  paused = true;
  pausedText.textContent = `+${CONTINUE_MS / 1000}초`;
  $('paused').hidden = false;
  $('resume').focus();
});

async function pickPair(exclude?: string): Promise<string> {
  const { pairs } = await index;
  const pool = pairs.length > 1 ? pairs.filter((p) => p.pair !== exclude) : pairs;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (!pick) throw new Error('출제할 초성이 없어요');
  return pick.pair;
}

// ---------- 타이틀 ----------

const dailyBtn = $<HTMLButtonElement>('daily');

function renderTitle(): void {
  const day = todayKey();
  $('daily-no').textContent = `#${dayNumber(day)}`;
  const best = getBest();
  const done = getDaily(day);
  const streak = liveStreak(getStreak(), day);
  const facts = [
    ...(best !== null ? [`최고 기록 ${best}단어`] : []),
    ...(done ? [`오늘 ${done.score}단어`] : []),
    ...(streak > 1 ? [`연속 ${streak}일`] : []),
  ];
  const el = $('title-best');
  el.hidden = facts.length === 0;
  el.textContent = facts.join(' · ');
}

async function begin(btn: HTMLButtonElement, daily: boolean): Promise<void> {
  btn.disabled = true;
  try {
    if (daily) {
      const day = todayKey();
      await startGame(dailyPair((await index).pairs, day), day);
    } else await startGame(await pickPair());
  } catch {
    index = loadIndex(); // 다음 시도 때 다시 받기
    const err = $('title-error');
    err.hidden = false;
    err.textContent = '사전을 불러오지 못했어요. 다시 시도해 주세요.';
  } finally {
    btn.disabled = false;
  }
}
startBtn.addEventListener('click', () => void begin(startBtn, false));
dailyBtn.addEventListener('click', () => void begin(dailyBtn, true));

// ---------- 게임 ----------

async function startGame(pair: string, day: string | null = null): Promise<void> {
  const dict = await loadPair(pair);
  current = { pair, dict, day };
  firstGame = getBest() === null;
  continued = false;
  $('continue').hidden = true;
  $('stage-label').textContent = day ? `오늘의 초성 #${dayNumber(day)}` : '초성';
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
  expectKeyboard();
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
    timeUp();
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
  pausedText.textContent = '일시정지';
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
      timeUp();
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
  const { pair, dict, day } = current;
  const found = game.found;
  const { best, isNew } = recordScore(pair, found.length);

  $('r-pair').textContent = pair;
  const record = $('r-record');
  const dailyEl = $('r-daily');
  if (day) {
    // 오늘의 초성: 하루 첫 판만 기록으로 남는다
    const { first, record: rec, streak } = recordDaily({ day, pair, score: found.length });
    $('r-kicker').textContent = `오늘의 초성 #${dayNumber(day)}`;
    $('r-best').textContent = first
      ? '오늘 기록으로 남았어요'
      : `오늘 기록 ${rec.score}단어 (첫 판만 남아요)`;
    record.hidden = true;
    dailyEl.hidden = false;
    dailyEl.textContent = `연속 ${streak.count}일 · 최고 ${streak.best}일 · 내일 새 초성`;
  } else {
    $('r-kicker').textContent = '결과';
    $('r-best').textContent = `최고 기록 ${best}단어`;
    record.hidden = !isNew;
    dailyEl.hidden = true;
  }

  const foundList = $('r-found');
  foundList.replaceChildren(
    ...found.map((w) => {
      const li = document.createElement('li');
      li.append(wordButton(w));
      return li;
    }),
  );
  preload(pair);

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
  if (!record.hidden) {
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

/** 결과 화면의 단어: 누르면 뜻을 본다 */
function wordButton(word: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.word = word;
  b.textContent = word;
  return b;
}

/** 놓친 단어를 한 글자씩 타자 치듯 보여준다. */
function typeWords(list: HTMLElement, words: string[], delay: number): void {
  const items = words.map((w) => {
    const li = document.createElement('li');
    const b = wordButton(w);
    b.setAttribute('aria-label', w);
    li.append(b);
    list.append(li);
    return b;
  });
  if (reducedMotion()) return;
  items.forEach((b) => {
    b.textContent = '';
    b.style.visibility = 'hidden';
  });
  let t = delay;
  items.forEach((b, i) => {
    const w = words[i] ?? '';
    setTimeout(() => (b.style.visibility = ''), t);
    [...w].forEach((_, k) => {
      setTimeout(() => (b.textContent = w.slice(0, k + 1)), t + k * 70);
    });
    t += w.length * 70 + 90;
  });
}

// ---------- 단어 뜻 ----------
// 결과 화면의 단어를 누르면 아래에서 시트가 올라온다. 이전·다음으로 찾은 단어와 놓친 단어를 차례로 넘겨 본다.

const meaningEl = $<HTMLDialogElement>('meaning');
let meaningList: string[] = [];
let meaningAt = 0;

async function showMeaning(at: number): Promise<void> {
  if (!current) return;
  const pair = current.pair;
  meaningAt = at;
  const word = meaningList[at]!;
  $('m-word').textContent = word;
  $('m-pos').textContent = '';
  $('m-defs').replaceChildren();
  $('m-status').textContent = '뜻을 불러오는 중…';
  $<HTMLButtonElement>('m-prev').disabled = at === 0;
  $<HTMLButtonElement>('m-next').disabled = at === meaningList.length - 1;
  if (!meaningEl.open) meaningEl.showModal();
  try {
    const m = await lookup(pair, word);
    if (meaningList[meaningAt] !== word) return; // 그사이 다른 단어로 넘어감
    $('m-pos').textContent = m?.pos ?? '';
    $('m-defs').replaceChildren(
      ...(m?.defs ?? []).map((d) => {
        const li = document.createElement('li');
        li.textContent = d;
        return li;
      }),
    );
    $('m-status').textContent = m ? '' : '사전에 풀이가 없는 말이에요';
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
// 시트 밖(어두운 배경)을 누르면 닫는다
meaningEl.addEventListener('click', (e) => {
  if (e.target === meaningEl) meaningEl.close();
});

$('again').addEventListener('click', async () => {
  if (!current) return;
  await startGame(nextPair ?? (await pickPair(current.pair)));
});

$('same').addEventListener('click', () => {
  if (current) void startGame(current.pair, current.day);
});

$('home').addEventListener('click', () => {
  renderTitle();
  show('title');
});

let toastTimer = 0;
function showToast(text: string): void {
  const toast = $('toast');
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500);
}

$('share').addEventListener('click', async () => {
  if (!game || !current) return;
  try {
    const { day } = current;
    const daily = day ? { no: dayNumber(day), streak: liveStreak(getStreak(), day) } : undefined;
    const outcome = await share(shareText(current.pair, game.found, daily));
    if (outcome !== 'copied') return;
  } catch {
    return;
  }
  showToast('복사됨');
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
  } else if (!screens.result.hidden && !meaningEl.open && performance.now() - resultAt > 800) {
    e.preventDefault();
    $('again').click();
  }
});

// ---------- 시작 ----------

renderTitle();
void introDone.then(() =>
  play(
    $('title').querySelector('.logo')!,
    [
      { transform: 'scale(0.6)', opacity: 0 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 400, easing: SPRING },
  ),
);
index.catch(() => {});
