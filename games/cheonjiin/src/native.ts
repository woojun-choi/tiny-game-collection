/** iOS 앱(Capacitor)에서만 쓰는 기능. 웹에서는 아무것도 안 하거나 웹 동작으로 대신한다. */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { shareResult, type ShareOutcome } from '@tgh/ui';
import { load, save } from './persist';

export const isApp = Capacitor.isNativePlatform();

const HAPTICS = 'cheonjiin.haptics';
/** 진동은 기본 켬. 설정에서 끌 수 있다 */
export function hapticsOn(): boolean {
  return load(HAPTICS) !== '0';
}
export function setHaptics(on: boolean): void {
  save(HAPTICS, on ? '1' : '0');
}
const buzz = () => isApp && hapticsOn();

/** 키를 누를 때 */
export function hapticPress(): void {
  if (buzz()) void Haptics.impact({ style: ImpactStyle.Light });
}

/** 단어를 맞혔을 때. 길수록 세게 */
export function hapticWord(length: number): void {
  if (buzz()) void Haptics.impact({ style: length >= 4 ? ImpactStyle.Heavy : ImpactStyle.Medium });
}

/** 판을 다 비웠을 때 */
export function hapticClear(): void {
  if (buzz()) void Haptics.notification({ type: NotificationType.Success });
}

/** 앱은 iOS 공유 시트, 웹은 기존 동작(Web Share 또는 복사) */
export async function share(text: string): Promise<ShareOutcome> {
  if (!isApp) return shareResult(text);
  try {
    await Share.share({ text });
    return 'shared';
  } catch {
    return 'cancelled';
  }
}
