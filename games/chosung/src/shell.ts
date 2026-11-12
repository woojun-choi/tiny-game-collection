/**
 * 앱 껍데기 설정. 시작 연출보다 먼저 돌아야 한다:
 * 뷰포트(노치 아래까지 그리기)가 연출 도중에 바뀌면 화면 크기가 달라져 그어 둔 격자가 움직여 보인다.
 */
import { Keyboard } from '@capacitor/keyboard';
import { isApp } from '@tgh/ui/app';

if (isApp) {
  const root = document.documentElement;
  // 웹 전용 머리말(포트폴리오 링크)을 숨기고 안전 영역을 띄운다
  root.classList.add('app');
  // 핀치 확대는 막고, 노치 아래까지 그린 뒤 안전 영역만큼 띄운다
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content',
    );
  // 키보드 위 이전·다음·완료 막대는 칸이 하나뿐이라 자리만 차지한다
  void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  // 플러그인은 키보드가 다 올라온 뒤에야 body 높이를 줄여 배치가 두 번 바뀐다.
  // 올라오기 시작할 때 같은 높이로 바로 줄이고, 그 높이를 기억해 다음 판은 키보드보다 먼저 맞춘다.
  void Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
    try {
      localStorage.setItem(KB_HEIGHT, String(keyboardHeight));
    } catch {
      // 기억하지 못해도 이번 판은 그대로 맞춘다
    }
    fitKeyboard(keyboardHeight);
  });
  void Keyboard.addListener('keyboardWillHide', () => fitKeyboard(0));
}

const KB_HEIGHT = 'giyeoksiot.kbHeight';

/** 키보드 높이만큼 body를 줄이고(0이면 되돌림) 키보드용 배치(.kb)로 바꾼다 */
function fitKeyboard(height: number): void {
  document.documentElement.classList.toggle('kb', height > 0);
  document.body.style.height = height > 0 ? `${innerHeight - height}px` : '';
}

/** 게임 화면을 띄우기 직전: 지난번 키보드 높이로 미리 맞춰, 키보드가 올라올 때 배치가 바뀌지 않게 */
export function expectKeyboard(): void {
  if (!isApp) return;
  let h = 0;
  try {
    h = Number(localStorage.getItem(KB_HEIGHT)) || 0;
  } catch {
    // 처음이면 키보드가 올라올 때 맞춘다
  }
  if (h > 0) fitKeyboard(h);
}
