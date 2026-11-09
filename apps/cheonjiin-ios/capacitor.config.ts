import type { CapacitorConfig } from '@capacitor/cli';

/** 천지인 iOS 앱. 웹 빌드(games/cheonjiin/dist)를 그대로 싣는다. */
const config: CapacitorConfig = {
  appId: 'com.uzunchoi.cheonjiin',
  appName: '천지인',
  webDir: '../../games/cheonjiin/dist',
  ios: {
    contentInset: 'never',
  },
};

export default config;
