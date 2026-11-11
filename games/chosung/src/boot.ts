// 저장된 기록을 먼저 되살린 뒤 게임을 띄운다. 최고 기록을 첫 화면에서 바로 읽기 때문에 순서가 중요하다.
import { restore } from '@tgh/ui/app';
// 시작 연출은 기록을 되살리는 동안에도 바로 돈다
import './intro';

void restore('giyeoksiot.').finally(() => import('./main'));
