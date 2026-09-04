import 'server-only';

import {
  gradeRecognitionScore,
  recognitionThresholdDefaults,
  type RecognitionThresholds,
  type RecognitionTier,
} from '@/lib/recognition';

/**
 * 生效中的识别分档阈值。
 *
 * 默认值在 `lib/recognition.ts`（纯常量与纯函数，客户端组件也能引用）；这里只做
 * 环境覆盖，因为阈值属于运营参数，不该内联进客户端包。
 *
 * **刻意不 import `server/env.ts`**：那个模块在模块作用域校验并抛错，全仓库只有
 * `instrumentation.ts` 在 `register()` 里动态引入它，因此构建期不会求值。任何被路由
 * 静态依赖的模块一旦 import 它，`next build` 就会在缺少生产变量的 CI 上直接失败
 * （实测报 `Failed to collect page data for /api/recognition/scan`）。取值合法性与
 * 两档顺序仍由 `server/env.ts` 在启动时校验，配错依然起不来。
 */
function readThreshold(raw: string | undefined, fallback: number) {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

export const recognitionThresholds: RecognitionThresholds = {
  autoLight: readThreshold(
    process.env.RECOGNITION_AUTO_LIGHT_THRESHOLD,
    recognitionThresholdDefaults.autoLight,
  ),
  candidate: readThreshold(
    process.env.RECOGNITION_CANDIDATE_THRESHOLD,
    recognitionThresholdDefaults.candidate,
  ),
};

/** 按当前生效阈值给最高分分档。 */
export function gradeRecognition(
  topScore: number | null | undefined,
): RecognitionTier {
  return gradeRecognitionScore(topScore, recognitionThresholds);
}
