import { z } from 'zod';

export const recognitionSourceValues = ['camera', 'upload'] as const;
export const recognitionCaptureModeValues = ['manual', 'auto'] as const;
export const recognitionProviderValues = [
  'mock-placeholder',
  'embedding-search',
] as const;
export const recognitionSimilarityMetricValues = [
  'cosine',
  'dot_product',
  'l2',
] as const;
export const recognitionEmbeddingStatusValues = [
  'pending',
  'ready',
  'failed',
] as const;
export const recognitionErrorCodeValues = [
  'INVALID_PAYLOAD',
  'MISSING_IMAGE',
  'UNSUPPORTED_IMAGE_TYPE',
  'IMAGE_TOO_LARGE',
  'UNAUTHORIZED',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export const recognitionSourceSchema = z.enum(recognitionSourceValues);
export const recognitionCaptureModeSchema = z.enum(
  recognitionCaptureModeValues,
);
export const recognitionProviderSchema = z.enum(recognitionProviderValues);
export const recognitionSimilarityMetricSchema = z.enum(
  recognitionSimilarityMetricValues,
);
export const recognitionEmbeddingStatusSchema = z.enum(
  recognitionEmbeddingStatusValues,
);
export const recognitionErrorCodeSchema = z.enum(recognitionErrorCodeValues);

export const recognitionUploadLimits = {
  maxFileSizeBytes: 10 * 1024 * 1024,
} as const;

export const recognitionCandidateDisplayLimit = 5;
export const recognitionStrongMatchThreshold = 0.72;
export const recognitionWeakMatchThreshold = 0.58;
export const recognitionAttemptTtlMs = 15 * 60 * 1000;

export const recognitionRequestMetadataSchema = z.object({
  source: recognitionSourceSchema.default('upload'),
  captureMode: recognitionCaptureModeSchema.optional(),
});

export const recognitionCandidateMapSchema = z
  .record(z.string().uuid(), z.string().uuid())
  .refine(
    (value) => Object.keys(value).length <= recognitionCandidateDisplayLimit,
    '识别候选数量超出限制。',
  );

export const confirmRecognitionCandidateInputSchema = z
  .object({
    requestId: z.string().uuid(),
    candidateId: z.string().uuid(),
  })
  .strict();

export function isRecognitionAttemptEligible({
  source,
  provider,
}: {
  source: string;
  provider: string;
}) {
  return source === 'camera' && provider === 'embedding-search';
}

// Future image-similarity matching should resolve to a specific goods_images row
// when possible, while keeping the candidate response stable for the current
// placeholder implementation.
export const recognitionCandidateSimilaritySchema = z.object({
  matchedGoodsImageId: z.string().uuid().nullable(),
  matchedImageUrl: z.string().url().nullable(),
  score: z.number().min(0).max(1),
  distance: z.number().nonnegative().nullable(),
  metric: recognitionSimilarityMetricSchema.nullable(),
  embedding: z.object({
    status: recognitionEmbeddingStatusSchema.nullable(),
    provider: z.string().min(1).nullable(),
    model: z.string().min(1).nullable(),
    modelVersion: z.string().min(1).nullable(),
    dimensions: z.number().int().positive().nullable(),
    indexedAt: z.string().datetime().nullable(),
  }),
});

export const recognitionCandidateSchema = z.object({
  id: z.string().min(1),
  rank: z.number().int().min(1),
  score: z.number().min(0).max(1),
  matchReason: z.string().min(1),
  goods: z.object({
    slug: z.string().min(1),
    skuCode: z.string().min(1),
    name: z.string().min(1),
    goodsType: z.string().min(1),
    seriesName: z.string().min(1),
    ipName: z.string().min(1),
    characterNames: z.array(z.string().min(1)).default([]),
    material: z.string().min(1).nullable(),
    sizeLabel: z.string().min(1).nullable(),
    edition: z.string().min(1).nullable(),
    primaryImageUrl: z.string().url().nullable(),
  }),
  similarity: recognitionCandidateSimilaritySchema,
});

export const recognitionSuccessResponseSchema = z.object({
  ok: z.literal(true),
  requestId: z.string().uuid(),
  pipeline: z.object({
    provider: recognitionProviderSchema,
    stage: z.literal('candidate_matching'),
    generatedAt: z.string().datetime(),
    embeddingVersion: z.string().nullable(),
  }),
  image: z.object({
    filename: z.string().nullable(),
    contentType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    source: recognitionSourceSchema,
    captureMode: recognitionCaptureModeSchema.nullable(),
  }),
  candidates: z.array(recognitionCandidateSchema),
  warnings: z.array(z.string()),
});

export const recognitionErrorResponseSchema = z.object({
  ok: z.literal(false),
  requestId: z.string().uuid(),
  error: z.object({
    code: recognitionErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
});

export const recognitionResponseSchema = z.union([
  recognitionSuccessResponseSchema,
  recognitionErrorResponseSchema,
]);

export type RecognitionRequestMetadata = z.infer<
  typeof recognitionRequestMetadataSchema
>;
export type RecognitionCandidateMap = z.infer<
  typeof recognitionCandidateMapSchema
>;
export type ConfirmRecognitionCandidateInput = z.infer<
  typeof confirmRecognitionCandidateInputSchema
>;
export type RecognitionCandidate = z.infer<typeof recognitionCandidateSchema>;
export type RecognitionCandidateSimilarity = z.infer<
  typeof recognitionCandidateSimilaritySchema
>;
export type RecognitionSuccessResponse = z.infer<
  typeof recognitionSuccessResponseSchema
>;
export type RecognitionErrorResponse = z.infer<
  typeof recognitionErrorResponseSchema
>;
export type RecognitionResponse = z.infer<typeof recognitionResponseSchema>;
