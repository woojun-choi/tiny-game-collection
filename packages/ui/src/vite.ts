import type { Plugin } from 'vite';

/**
 * 빌드 환경변수 VITE_ADSENSE_CLIENT가 있으면 애드센스 스크립트를 <head>에 넣는다.
 * 애드센스 사이트 확인 크롤러가 HTML 원문에서 이 태그를 찾는다. 값이 없으면 아무것도 안 함.
 */
export function adsenseHead(): Plugin {
  let client: string | undefined;
  return {
    name: 'tgh-adsense-head',
    configResolved(config) {
      client = config.env.VITE_ADSENSE_CLIENT;
    },
    transformIndexHtml() {
      if (!client) return;
      return [
        {
          tag: 'script',
          attrs: {
            async: true,
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
            crossorigin: 'anonymous',
          },
          injectTo: 'head',
        },
      ];
    },
  };
}
