/** vite.config.ts의 define: 앱 빌드(--mode app)일 때만 true. 웹에는 광고 코드가 없다 */
declare const __ADS__: boolean;

interface ImportMetaEnv {
  /** 앱 빌드 때 .env.app.local에서. 없으면 Google 테스트 광고 */
  readonly VITE_ADMOB_BANNER?: string;
  readonly VITE_ADMOB_REWARDED?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
