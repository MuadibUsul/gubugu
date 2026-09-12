import { describe, expect, it } from 'vitest';
import { frameChanged, scanSaveInputSchema } from './scan-batch';

describe('scan batch boundaries', () => {
  it('ignores minor exposure changes but rearms for a different card', () => {
    expect(frameChanged([80, 90, 100], [85, 96, 108])).toBe(false);
    expect(frameChanged([80, 90, 100], [170, 30, 200])).toBe(true);
    expect(frameChanged([], [80, 90, 100])).toBe(true);
  });
  it('requires a server recognition attempt when selecting a candidate', () => {
    const captureId = crypto.randomUUID();
    expect(
      scanSaveInputSchema.safeParse({
        captureId,
        requestId: null,
        candidateId: null,
      }).success,
    ).toBe(true);
    expect(
      scanSaveInputSchema.safeParse({
        captureId,
        requestId: null,
        candidateId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      scanSaveInputSchema.safeParse({
        captureId: '../other',
        requestId: null,
        candidateId: null,
      }).success,
    ).toBe(false);
  });
});
