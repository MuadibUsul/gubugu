import 'server-only';

import {
  gradeRecognitionScore,
  recognitionThresholdDefaults,
  type RecognitionThresholds,
  type RecognitionTier,
} from '@/lib/recognition';
import { env } from '@/server/env';

/**
 * 生效中的识别分档阈值。
 *
 * 默认值在 `lib/recognition.ts`，那里是纯常量与纯函数，客户端组件也能引用；
 * 环境覆盖只在服务端解析，因为阈值属于运营参数，不该内联进客户端包。
 * 取值区间与两档顺序由 server/env.ts 校验，配错会在启动时报错而不是静默生效。
 */
export const recognitionThresholds: RecognitionThresholds = {
  autoLight:
    env.RECOGNITION_AUTO_LIGHT_THRESHOLD ??
    recognitionThresholdDefaults.autoLight,
  candidate:
    env.RECOGNITION_CANDIDATE_THRESHOLD ??
    recognitionThresholdDefaults.candidate,
};

/** 按当前生效阈值给最高分分档。 */
export function gradeRecognition(
  topScore: number | null | undefined,
): RecognitionTier {
  return gradeRecognitionScore(topScore, recognitionThresholds);
}
