import { describe, expect, it } from 'vitest';

import {
  confirmRecognitionCandidateInputSchema,
  gradeRecognitionScore,
  isRecognitionAttemptEligible,
  recognitionCandidateMapSchema,
  recognitionThresholdDefaults,
  shouldRetryAutomaticCapture,
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

describe('gradeRecognitionScore', () => {
  const { autoLight, candidate } = recognitionThresholdDefaults;

  it('auto-lights at or above the auto-light threshold', () => {
    expect(gradeRecognitionScore(autoLight)).toBe('auto-light');
    expect(gradeRecognitionScore(0.99)).toBe('auto-light');
  });

  // 边界归属必须明确：差一点点就不能自动点亮，宁可让用户确认。
  it('does not auto-light just below the threshold', () => {
    expect(gradeRecognitionScore(autoLight - 0.0001)).toBe('candidates');
  });

  it('offers candidates between the two thresholds', () => {
    expect(gradeRecognitionScore(candidate)).toBe('candidates');
    expect(gradeRecognitionScore((autoLight + candidate) / 2)).toBe(
      'candidates',
    );
  });

  it('treats anything below the candidate floor as unidentified', () => {
    expect(gradeRecognitionScore(candidate - 0.0001)).toBe('unidentified');
    expect(gradeRecognitionScore(0)).toBe('unidentified');
  });

  // 没有候选时 topScore 是 null；不能因此把 undefined/NaN 当成 0 分以外的东西。
  it('treats a missing or unusable score as unidentified', () => {
    expect(gradeRecognitionScore(null)).toBe('unidentified');
    expect(gradeRecognitionScore(undefined)).toBe('unidentified');
    expect(gradeRecognitionScore(Number.NaN)).toBe('unidentified');
  });

  it('honours overridden thresholds', () => {
    const strict = { autoLight: 0.95, candidate: 0.8 };

    expect(gradeRecognitionScore(0.9, strict)).toBe('candidates');
    expect(gradeRecognitionScore(0.96, strict)).toBe('auto-light');
    expect(gradeRecognitionScore(0.7, strict)).toBe('unidentified');
  });
});

describe('automatic capture boundary', () => {
  it('silently retries irrelevant automatic crops instead of saving them', () => {
    expect(
      shouldRetryAutomaticCapture({
        captureMode: 'auto',
        tier: 'unidentified',
        provider: 'embedding-search',
      }),
    ).toBe(true);
    expect(
      shouldRetryAutomaticCapture({
        captureMode: 'auto',
        tier: 'candidates',
        provider: 'embedding-search',
      }),
    ).toBe(false);
    expect(
      shouldRetryAutomaticCapture({
        captureMode: 'manual',
        tier: 'unidentified',
        provider: 'embedding-search',
      }),
    ).toBe(false);
  });
});
