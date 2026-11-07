import { describe, expect, it } from 'vitest';
import { layoutFor, pickUnit, RAIL_MIN_WIDTH } from './ads';

describe('pickUnit', () => {
  it('환경변수가 없으면 광고 없음', () => {
    expect(pickUnit('rail', {})).toBeNull();
  });

  it('애드센스 값이 다 있으면 애드센스', () => {
    const env = {
      VITE_ADSENSE_CLIENT: 'ca-pub-1',
      VITE_ADSENSE_SLOT_RAIL: '9',
      VITE_ADFIT_RAIL: 'DAN-1',
    };
    expect(pickUnit('rail', env)).toEqual({ network: 'adsense', client: 'ca-pub-1', slot: '9' });
  });

  it('애드센스 슬롯이 없으면 애드핏으로', () => {
    const env = { VITE_ADSENSE_CLIENT: 'ca-pub-1', VITE_ADFIT_BOTTOM: 'DAN-2' };
    expect(pickUnit('bottom', env)).toEqual({ network: 'adfit', unit: 'DAN-2' });
    expect(pickUnit('rail', env)).toBeNull();
  });
});

describe('layoutFor', () => {
  it('넓고 높으면 좌우, 아니면 하단', () => {
    expect(layoutFor(RAIL_MIN_WIDTH, 900)).toBe('rail');
    expect(layoutFor(RAIL_MIN_WIDTH - 1, 900)).toBe('bottom');
    expect(layoutFor(1440, 600)).toBe('bottom');
    expect(layoutFor(390, 844)).toBe('bottom');
  });
});
