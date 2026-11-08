/**
 * 기기 저장소. 화면 코드는 localStorage처럼 동기로 읽고 쓴다.
 * iOS 앱에서는 쓸 때마다 네이티브 저장소(UserDefaults)에도 남기고, 시작할 때 비어 있는 값을 되살린다.
 * iOS는 저장 공간이 부족하면 웹뷰 데이터를 지울 수 있어서, 기록을 웹뷰에만 두지 않는다.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const PREFIX = 'cheonjiin.';
const native = Capacitor.isNativePlatform();

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
  if (native) Preferences.set({ key, value }).catch(() => {});
}

/** 앱 시작 때 한 번. 웹뷰에서 사라진 값을 네이티브 저장소에서 채운다. */
export async function restore(): Promise<void> {
  if (!native) return;
  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      if (!key.startsWith(PREFIX) || load(key) !== null) continue;
      const { value } = await Preferences.get({ key });
      if (value !== null) localStorage.setItem(key, value);
    }
  } catch {
    // 되살리지 못하면 웹뷰 값만으로 시작
  }
}
