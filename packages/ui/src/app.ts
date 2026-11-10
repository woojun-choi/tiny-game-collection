/**
 * iOS 앱(Capacitor)에서만 쓰는 기능. 웹에서는 아무것도 안 하거나 웹 동작으로 대신한다.
 * 웹 전용 게임이 Capacitor를 번들에 싣지 않도록 `@tgh/ui/app`으로 따로 낸다.
 */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { shareResult, type ShareOutcome } from './index';

export const isApp = Capacitor.isNativePlatform();

// ---------- 기기 저장소 ----------
// 화면 코드는 localStorage처럼 동기로 읽고 쓴다.
// 앱에서는 쓸 때마다 네이티브 저장소(UserDefaults)에도 남기고, 시작할 때 비어 있는 값을 되살린다.
// iOS는 저장 공간이 부족하면 웹뷰 데이터를 지울 수 있어서, 기록을 웹뷰에만 두지 않는다.

export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 시크릿 모드 등 저장 불가 환경은 무시
  }
  if (isApp) Preferences.set({ key, value }).catch(() => {});
}

/** 앱 시작 때 한 번. 웹뷰에서 사라진 `prefix`로 시작하는 값을 네이티브 저장소에서 채운다. */
export async function restore(prefix: string): Promise<void> {
  if (!isApp) return;
  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      if (!key.startsWith(prefix) || load(key) !== null) continue;
      const { value } = await Preferences.get({ key });
      if (value !== null) localStorage.setItem(key, value);
    }
  } catch {
    // 되살리지 못하면 웹뷰 값만으로 시작
  }
}

// ---------- 진동 ----------

export type Buzz = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const IMPACT = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };

/** 앱에서만 울린다. 켜고 끄는 설정은 게임 쪽에서 판단한다. */
export function buzz(kind: Buzz): void {
  if (!isApp) return;
  if (kind === 'success') void Haptics.notification({ type: NotificationType.Success });
  else if (kind === 'error') void Haptics.notification({ type: NotificationType.Error });
  else void Haptics.impact({ style: IMPACT[kind] });
}

// ---------- 공유 ----------

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
