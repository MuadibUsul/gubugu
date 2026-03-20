import 'server-only';

import {
  recognitionSuccessResponseSchema,
  type RecognitionRequestMetadata,
} from '@/lib/recognition';
import { buildMockRecognitionCandidates } from '@/server/recognition/mock';

type RecognizeGoodsImageInput = RecognitionRequestMetadata & {
  file: File;
};

export async function recognizeGoodsImage({
  file,
  source,
  captureMode,
}: RecognizeGoodsImageInput) {
  const candidates = buildMockRecognitionCandidates(file);
  const topScore = candidates[0]?.score ?? null;
  const warnings = ['当前结果用于辅助确认，请以最终选择的商品页为准。'];

  if (candidates.length === 0) {
    warnings.push('当前图片没有找到足够接近的候选商品。');
  } else if (topScore !== null && topScore < 0.72) {
    warnings.push('当前第一候选的置信度偏弱，建议手动核对或重新拍摄。');
  }

  return recognitionSuccessResponseSchema.parse({
    ok: true,
    requestId: crypto.randomUUID(),
    pipeline: {
      provider: 'catalog-recognition',
      stage: 'candidate_matching',
      generatedAt: new Date().toISOString(),
      embeddingVersion: null,
    },
    image: {
      filename: file.name || null,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      source,
      captureMode: captureMode ?? null,
    },
    candidates,
    warnings,
  });
}
