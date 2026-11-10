import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

/** ㄱㅅ iOS 앱. 웹 빌드(games/chosung/dist)를 그대로 싣는다. */
const config: CapacitorConfig = {
  appId: 'com.uzunchoi.chosung',
  appName: 'ㄱㅅ',
  webDir: '../../games/chosung/dist',
  ios: {
    contentInset: 'never',
  },
  plugins: {
    // 키보드가 올라오면 body 높이를 줄인다. native(웹뷰 자체를 줄이기)는 시뮬레이터에서 흰 화면만 떴다.
    Keyboard: { resize: KeyboardResize.Body },
  },
};

export default config;
