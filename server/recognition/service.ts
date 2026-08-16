import 'server-only';

import {
  recognitionStrongMatchThreshold,
  recognitionSuccessResponseSchema,
  type RecognitionCandidate,
  type RecognitionRequestMetadata,
} from '@/lib/recognition';
import {
  findRecognitionCandidates,
  hasReadyEmbeddings,
} from '@/server/data/recognition-search';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';
import {
  embedImage,
  embeddingModel,
  embeddingProvider,
} from '@/server/recognition/embedding';
import { buildMockRecognitionCandidates } from '@/server/recognition/mock';

type RecognizeGoodsImageInput = RecognitionRequestMetadata & {
  file: File;
};

type MatchResult = {
  candidates: RecognitionCandidate[];
  provider: 'embedding-search' | 'mock-placeholder';
  warnings: string[];
};

const MOCK_WARNING =
  '当前使用的是占位结果，与图片内容无关。图鉴尚未建立图像索引，请运行 pnpm db:embed 后再试。';

/**
 * Embeds the uploaded image and ranks it against the catalogue.
 *
 * Falls back to the placeholder list when the catalogue has no embeddings yet
 * or the database is unreachable, and says so in the warnings — a fake result
 * presented as a real one is worse than no result.
 */
async function matchAgainstCatalogue(file: File): Promise<MatchResult> {
  try {
    if (!(await hasReadyEmbeddings())) {
      return {
        candidates: buildMockRecognitionCandidates(file),
        provider: 'mock-placeholder',
        warnings: [MOCK_WARNING],
      };
    }

    const queryVector = await embedImage(file);

    return {
      candidates: await findRecognitionCandidates(queryVector),
      provider: 'embedding-search',
      warnings: [],
    };
  } catch (error) {
    if (isDatabaseAccessConfigurationError(error)) {
      return {
        candidates: buildMockRecognitionCandidates(file),
        provider: 'mock-placeholder',
        warnings: [MOCK_WARNING],
      };
    }

    throw error;
  }
}

export async function recognizeGoodsImage({
  file,
  source,
  captureMode,
}: RecognizeGoodsImageInput) {
  const { candidates, provider, warnings } = await matchAgainstCatalogue(file);
  const topScore = candidates[0]?.score ?? null;

  const allWarnings = [
    '当前结果用于辅助确认，请以最终选择的商品页为准。',
    ...warnings,
  ];

  if (candidates.length === 0) {
    allWarnings.push('当前图片没有找到足够接近的候选商品。');
  } else if (
    topScore !== null &&
    topScore < recognitionStrongMatchThreshold &&
    provider === 'embedding-search'
  ) {
    allWarnings.push('当前第一候选的置信度偏弱，建议手动核对或重新拍摄。');
  }

  return recognitionSuccessResponseSchema.parse({
    ok: true,
    requestId: crypto.randomUUID(),
    pipeline: {
      provider,
      stage: 'candidate_matching',
      generatedAt: new Date().toISOString(),
      embeddingVersion:
        provider === 'embedding-search'
          ? `${embeddingProvider}/${embeddingModel}`
          : null,
    },
    image: {
      filename: file.name || null,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      source,
      captureMode: captureMode ?? null,
    },
    candidates,
    warnings: allWarnings,
  });
}
