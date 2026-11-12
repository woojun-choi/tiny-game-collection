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
  void Keyboard.addListener('keyboardWillShow', () => root.classList.add('kb'));
  void Keyboard.addListener('keyboardWillHide', () => root.classList.remove('kb'));
}
