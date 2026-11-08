// 저장된 기록을 먼저 되살린 뒤 게임을 띄운다. 설정값을 모듈 로드 때 읽는 코드가 있어 순서가 중요하다.
import { restore } from './persist';

void restore().finally(() => import('./main'));
