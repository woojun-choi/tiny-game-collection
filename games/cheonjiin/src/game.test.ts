import { describe, expect, it } from 'vitest';
import { generateBoard, minPlanted } from './board';
import { nextCombo, points, readSelection, rectCells, isValidLength } from './game';

const COMMON = [
  ...'사과 기차 바다 나무 하늘 구름 가방 학교 친구 우유 사람 노래 시간 마음 얼굴 연필 의자 공원 시장 병원'.split(
    ' ',
  ),
  ...'자동차 도서관 비행기 냉장고 운동장 컴퓨터 지하철 할머니 아버지 경찰서 동물원 텔레비'.split(
    ' ',
  ),
  ...'대한민국 초등학교 자기소개 고속도로 오토바이 아이스크'.split(' '),
];

describe('rectCells / readSelection', () => {
  // 3열 판
  // 사 과 _
  // 기 _ 차
  const cells = ['사', '과', null, '기', null, '차'];

  it('가로 줄은 왼쪽에서 오른쪽으로 읽는다', () => {
    expect(readSelection(cells, rectCells(0, 1, 3)).text).toBe('사과');
    expect(readSelection(cells, rectCells(1, 0, 3)).text).toBe('사과');
  });

  it('세로 줄은 위에서 아래로 읽는다', () => {
    expect(readSelection(cells, rectCells(3, 0, 3)).text).toBe('사기');
  });

  it('2×2는 왼위, 오위, 왼아래, 오아래 순서', () => {
    expect(rectCells(0, 4, 3)).toEqual([0, 1, 3, 4]);
    expect(readSelection(cells, rectCells(4, 0, 3)).text).toBe('사과기');
  });

  it('빈칸은 건너뛰고 남은 키만 읽는다', () => {
    const sel = readSelection(cells, rectCells(3, 5, 3));
    expect(sel).toEqual({ keys: [3, 5], text: '기차' });
  });

  it('1글자나 5글자 이상은 정답 길이가 아니다', () => {
    expect(isValidLength('사')).toBe(false);
    expect(isValidLength('사과')).toBe(true);
    expect(isValidLength('대한민국')).toBe(true);
    expect(isValidLength('대한민국만')).toBe(false);
  });
});

describe('점수', () => {
  it('길이별 기본 점수', () => {
    expect(points(2, 0)).toBe(2);
    expect(points(3, 0)).toBe(6);
    expect(points(4, 0)).toBe(12);
  });

  it('3초 안에 이어 맞히면 콤보가 올라가고 최대 ×2.0', () => {
    expect(nextCombo(0, null, 1000)).toBe(0);
    expect(nextCombo(0, 1000, 3500)).toBe(1);
    expect(nextCombo(2, 1000, 3500)).toBe(3);
    expect(nextCombo(3, 1000, 3500)).toBe(3);
    expect(nextCombo(3, 1000, 4500)).toBe(0);
    expect(points(4, 3)).toBe(24);
    expect(points(3, 1)).toBe(7);
  });
});

describe('generateBoard', () => {
  for (const [cols, rows] of [
    [9, 13],
    [18, 9],
  ] as const) {
    it(`${cols}×${rows}: 심은 단어가 읽는 순서대로 판에 있고 칸이 다 찬다`, () => {
      const b = generateBoard(42, cols, rows, COMMON);
      expect(b.cells).toHaveLength(cols * rows);
      expect(b.cells.every((c) => typeof c === 'string')).toBe(true);
      const seen = new Set<number>();
      for (const p of b.planted) {
        expect(p.cells.map((i) => b.cells[i]).join('')).toBe(p.word);
        expect([...p.cells].sort((x, y) => x - y)).toEqual(p.cells);
        for (const i of p.cells) {
          expect(seen.has(i)).toBe(false);
          seen.add(i);
        }
      }
      expect(new Set(b.planted.map((p) => p.word)).size).toBe(b.planted.length);
    });
  }

  it('같은 시드면 같은 판', () => {
    expect(generateBoard(7, 7, 10, COMMON)).toEqual(generateBoard(7, 7, 10, COMMON));
    expect(generateBoard(7, 7, 10, COMMON).cells).not.toEqual(
      generateBoard(8, 7, 10, COMMON).cells,
    );
  });

  // 오늘의 퍼즐은 모두 같은 판이어야 한다. 생성기의 난수 소비 순서가 바뀌면 이 값이 깨진다.
  it('판 생성 결과가 버전이 바뀌어도 그대로다', () => {
    const b = generateBoard(20261108, 9, 13, COMMON);
    expect(b.cells.join('')).toMatchInlineSnapshot(
      `"기차동학친구사람의시간찰교구비행기자도크동아름아이자과서자아버지스크기연관동동사초등할소필지차물학학교머개교마음원구나무니공원지하철텔레비대한경시냉장고병원민국찰장노래지하오토운서구래가장늘바이동우바다방사컴퓨터장유과얼굴과퓨고속도로"`,
    );
  });

  it('최소 단어 수는 칸의 3분의 1', () => {
    expect(minPlanted(9, 13)).toBe(39);
    expect(minPlanted(18, 9)).toBe(54);
  });
});
