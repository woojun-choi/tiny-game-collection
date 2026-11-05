import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareResult } from './index';

function setup({ touch, share }: { touch: boolean; share?: () => Promise<void> }) {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('matchMedia', () => ({ matches: touch }));
  vi.stubGlobal('navigator', { share, clipboard: { writeText } });
  return { writeText };
}

afterEach(() => vi.unstubAllGlobals());

describe('shareResult', () => {
  it('uses Web Share on touch devices', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const { writeText } = setup({ touch: true, share });
    expect(await shareResult('hi')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'hi' });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies to clipboard on desktop even if Web Share exists', async () => {
    const share = vi.fn();
    const { writeText } = setup({ touch: false, share });
    expect(await shareResult('hi')).toBe('copied');
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('reports cancel when the user dismisses the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('', 'AbortError'));
    const { writeText } = setup({ touch: true, share });
    expect(await shareResult('hi')).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when Web Share fails', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('', 'NotAllowedError'));
    const { writeText } = setup({ touch: true, share });
    expect(await shareResult('hi')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hi');
  });
});
