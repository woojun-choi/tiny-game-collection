import { describe, expect, it } from 'vitest';
import { addWord, cleanWord, extractBasic, extractHeadwords, type PairTable } from './extract';

describe('cleanWord', () => {
  it('붙임표·띄어쓰기 표시·어깨번호를 뗀다', () => {
    expect(cleanWord('가-수')).toBe('가수');
    expect(cleanWord('감^사')).toBe('감사');
    expect(cleanWord('사과02')).toBe('사과');
  });
});

describe('extract', () => {
  it('JSON과 XML에서 word 필드를 찾는다', () => {
    expect(extractHeadwords('{"wordinfo":{"word":"가수"}},{"word" : "감사"}')).toEqual([
      '가수',
      '감사',
    ]);
    expect(extractHeadwords('<item><word>국수</word></item>')).toEqual(['국수']);
    expect(extractHeadwords('<wordInfo><word><![CDATA[가-다]]></word>')).toEqual(['가-다']);
  });

  it('기초사전 LMF에서 표제어와 등급, 품사를 찾는다', () => {
    const xml = `<LexicalEntry><Lemma><feat att="writtenForm" val="가방"/></Lemma>
      <feat att="partOfSpeech" val="명사"/><feat att="vocabularyLevel" val="초급"/></LexicalEntry>
      <LexicalEntry><Lemma><feat att="writtenForm" val="가사"/></Lemma></LexicalEntry>`;
    expect(extractBasic(xml)).toEqual([
      ['가방', 1, '명사'],
      ['가사', 4, ''],
    ]);
  });
});

describe('addWord', () => {
  it('두 음절 단어만 초성 쌍별로 모으고 더 흔한 순위를 남긴다', () => {
    const t: PairTable = { pairs: new Map() };
    addWord(t, '가-수', 9);
    addWord(t, '가수', 1);
    addWord(t, '가수왕', 1);
    addWord(t, 'ab', 1);
    expect([...t.pairs.entries()].map(([k, v]) => [k, [...v]])).toEqual([['ㄱㅅ', [['가수', 1]]]]);
  });
});
