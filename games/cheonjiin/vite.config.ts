import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base './': 앱 웹뷰에서도 에셋을 상대경로로 찾게.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
});
