const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;

/** 초성 19자, 유니코드 순서. */
export const CHOSUNG_LIST: readonly string[] = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];

/** 완성형 한글 음절(가~힣) 한 글자인지. */
export function isSyllable(ch: string): boolean {
  const code = ch.codePointAt(0);
  return ch.length === 1 && code !== undefined && code >= SYLLABLE_START && code <= SYLLABLE_END;
}

/** 완성형 한글 음절의 초성. 한글 음절이 아니면 null. */
export function getChosung(syllable: string): string | null {
  if (!isSyllable(syllable)) return null;
  return CHOSUNG_LIST[Math.floor((syllable.charCodeAt(0) - SYLLABLE_START) / 588)] ?? null;
}

/** 단어 전체의 초성 문자열 (감사 → ㄱㅅ). 한글 음절이 아닌 글자가 있으면 null. */
export function getChosungs(word: string): string | null {
  let out = '';
  for (const ch of word) {
    const c = getChosung(ch);
    if (c === null) return null;
    out += c;
  }
  return out;
}
