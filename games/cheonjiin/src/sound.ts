/**
 * 기계식 키보드 소리. 음원 파일 없이 Web Audio로 합성한다(용량 0).
 * 기본은 꺼짐. 켜면 localStorage에 기억한다.
 */
const KEY = 'cheonjiin.sound';
let ctx: AudioContext | null = null;
let on = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();

export function soundOn(): boolean {
  return on;
}

export function setSound(value: boolean): void {
  on = value;
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // 무시
  }
  if (on) audio();
}

function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 짧은 잡음을 걸러 '톡' 소리를 만든다. */
function click(freq: number, gain: number, ms: number): void {
  if (!on) return;
  const a = audio();
  const len = Math.floor((a.sampleRate * ms) / 1000);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(a.destination);
  src.start();
}

/** 누를 때 낮은 '도각' */
export const thock = () => click(420, 1.4, 45);
/** 뗄 때 가벼운 '딸깍' */
export const clack = () => click(2200, 0.6, 25);

/** 정답 차임. 글자 수만큼 음이 올라간다. */
export function chime(length: number): void {
  if (!on) return;
  const a = audio();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  for (let k = 0; k < length; k++) {
    const t = a.currentTime + k * 0.07;
    const osc = a.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = notes[k] ?? 1046.5;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(g).connect(a.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }
}
