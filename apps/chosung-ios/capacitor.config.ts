import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

/** ㄱㄴ iOS 앱. 웹 빌드(games/chosung/dist)를 그대로 싣는다. */
const config: CapacitorConfig = {
  appId: 'com.uzunchoi.chosung',
  appName: 'ㄱㄴ',
  webDir: '../../games/chosung/dist',
  ios: {
    contentInset: 'never',
  },
  plugins: {
    // 키보드가 올라오면 body 높이를 줄인다. native(웹뷰 자체를 줄이기)는 시뮬레이터에서 흰 화면만 떴다.
    Keyboard: { resize: KeyboardResize.Body },
    // 시작 화면을 웹이 첫 장면(같은 두 칸)을 그릴 때까지 붙잡아 둔다. 사이에 흰 화면이 끼지 않게.
    // 숨기는 건 intro.ts가 한다.
    SplashScreen: { launchAutoHide: false, launchFadeOutDuration: 0 },
  },
};

export default config;
