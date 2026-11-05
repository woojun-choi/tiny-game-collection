export type ShareOutcome = 'shared' | 'copied' | 'cancelled';

/**
 * 결과 공유. 모바일(터치 기기)에서는 Web Share API, 그 외에는 클립보드 복사.
 * 'copied'일 때 호출한 쪽에서 "복사됨" 토스트를 띄운다.
 */
export async function shareResult(text: string): Promise<ShareOutcome> {
  const isTouch = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (isTouch && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // 그 외 실패는 클립보드로 대체
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
