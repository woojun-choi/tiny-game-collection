/** 천지인의 진동 규칙. 앱 공용 기능은 @tgh/ui/app에 있다. */
import { buzz, load, save } from '@tgh/ui/app';

export { isApp, share } from '@tgh/ui/app';

const HAPTICS = 'cheonjiin.haptics';
/** 진동은 기본 켬. 설정에서 끌 수 있다 */
export function hapticsOn(): boolean {
  return load(HAPTICS) !== '0';
}
export function setHaptics(on: boolean): void {
  save(HAPTICS, on ? '1' : '0');
}

/** 키를 누를 때 */
export function hapticPress(): void {
  if (hapticsOn()) buzz('light');
}

/** 단어를 맞혔을 때. 길수록 세게 */
export function hapticWord(length: number): void {
  if (hapticsOn()) buzz(length >= 4 ? 'heavy' : 'medium');
}

/** 판을 다 비웠을 때 */
export function hapticClear(): void {
  if (hapticsOn()) buzz('success');
}
