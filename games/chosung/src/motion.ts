const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');

export const SPRING = 'cubic-bezier(.34,1.56,.64,1)';

export function reducedMotion(): boolean {
  return reduceQuery.matches;
}

/** 일회성 애니메이션. 동작 줄이기 설정이면 아무것도 하지 않는다. */
export function play(
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {},
): Animation | null {
  if (reducedMotion()) return null;
  return el.animate(keyframes, { duration: 250, easing: SPRING, ...options });
}

/** 잠깐 색을 뒤집는다. 깜빡임 제한(초당 1회)은 호출하는 쪽에서 지킨다. */
export function flashInvert(el: Element, ms = 120): void {
  el.classList.add('invert');
  setTimeout(() => el.classList.remove('invert'), ms);
}
