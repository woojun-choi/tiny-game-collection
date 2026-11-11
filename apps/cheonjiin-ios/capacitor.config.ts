import type { CapacitorConfig } from '@capacitor/cli';

/** 천지인 iOS 앱. 웹 코드를 앱 모드로 빌드한 것(games/cheonjiin/dist-app, 광고 포함)을 싣는다. */
const config: CapacitorConfig = {
  appId: 'com.uzunchoi.cheonjiin',
  appName: '천지인',
  webDir: '../../games/cheonjiin/dist-app',
  ios: {
    contentInset: 'never',
  },
};

export default config;
