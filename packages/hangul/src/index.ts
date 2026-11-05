const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;
const CHOSUNG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

/** 완성형 한글 음절의 초성. 한글 음절이 아니면 null. */
export function getChosung(syllable: string): string | null {
  const code = syllable.codePointAt(0);
  if (code === undefined || code < SYLLABLE_START || code > SYLLABLE_END) return null;
  return CHOSUNG[Math.floor((code - SYLLABLE_START) / 588)] ?? null;
}
