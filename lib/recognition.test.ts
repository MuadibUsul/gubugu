import { describe, expect, it } from 'vitest';

import {
  confirmRecognitionCandidateInputSchema,
  isRecognitionAttemptEligible,
  recognitionCandidateMapSchema,
} from './recognition';

const requestId = '10000000-0000-4000-8000-000000000001';
const candidateId = '10000000-0000-4000-8000-000000000002';
const goodsId = '10000000-0000-4000-8000-000000000003';

describe('recognition lighting boundary', () => {
  it('only permits real camera attempts to light a SKU', () => {
    expect(
      isRecognitionAttemptEligible({
        source: 'camera',
        provider: 'embedding-search',
      }),
    ).toBe(true);
    expect(
      isRecognitionAttemptEligible({
        source: 'upload',
        provider: 'embedding-search',
      }),
    ).toBe(false);
    expect(
      isRecognitionAttemptEligible({
        source: 'camera',
        provider: 'mock-placeholder',
      }),
    ).toBe(false);
  });

  it('never accepts a browser supplied goods id during confirmation', () => {
    expect(
      confirmRecognitionCandidateInputSchema.safeParse({
        requestId,
        candidateId,
      }).success,
    ).toBe(true);
    expect(
      confirmRecognitionCandidateInputSchema.safeParse({
        requestId,
        candidateId,
        goodsId,
      }).success,
    ).toBe(false);
  });

  it('keeps the persisted candidate map small and UUID-only', () => {
    expect(
      recognitionCandidateMapSchema.safeParse({ [candidateId]: goodsId })
        .success,
    ).toBe(true);
    expect(
      recognitionCandidateMapSchema.safeParse({ 'browser-goods-id': goodsId })
        .success,
    ).toBe(false);
    expect(
      recognitionCandidateMapSchema.safeParse(
        Object.fromEntries(
          Array.from({ length: 6 }, (_, index) => [
            `10000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
            goodsId,
          ]),
        ),
      ).success,
    ).toBe(false);
  });
});
