import { defineConfig } from 'vite';

// base './': 앱 웹뷰에서도 에셋을 상대경로로 찾게.
// --mode app: iOS 앱용 빌드(dist-app). 광고 코드는 이때만 들어간다. 웹 빌드(dist)에는 없다.
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __ADS__: JSON.stringify(mode === 'app'),
  },
  build: mode === 'app' ? { outDir: 'dist-app' } : {},
}));
