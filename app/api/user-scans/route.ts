import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api/envelope';
import { consumeServerWrite } from '@/lib/rate-limit';
import { scanSaveInputSchema } from '@/lib/scan-batch';
import { getAuthUser } from '@/server/auth/session';
import { saveCapturedScan, saveScanBack } from '@/server/user-scans/save';
import {
  readScanForm,
  scanImageFile,
  ScanUploadError,
} from '@/server/user-scans/upload';

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return apiError(401, 'UNAUTHORIZED', '请先登录。');
  if (
    !consumeServerWrite(`${user.id}:scan-save`, { limit: 40, windowMs: 60_000 })
  ) {
    return apiError(429, 'RATE_LIMITED', '保存过于频繁，请稍后重试。');
  }
  try {
    const form = await readScanForm(request);
    if (form.get('scanId')) {
      const scanId = z.string().uuid().parse(form.get('scanId'));
      const file = scanImageFile(form.get('back'));
      const saved = await saveScanBack(
        user.id,
        scanId,
        Buffer.from(await file.arrayBuffer()),
      );
      return saved
        ? apiSuccess({ scanId: saved })
        : apiError(404, 'NOT_FOUND', '收藏不存在。');
    }
    const input = scanSaveInputSchema.parse({
      captureId: form.get('captureId'),
      requestId: form.get('requestId'),
      candidateId: form.get('candidateId'),
    });
    const front = scanImageFile(form.get('front'));
    const back = form.has('back') ? scanImageFile(form.get('back')) : null;
    return apiSuccess(
      await saveCapturedScan({
        ...input,
        userId: user.id,
        front: Buffer.from(await front.arrayBuffer()),
        back: back ? Buffer.from(await back.arrayBuffer()) : null,
      }),
    );
  } catch (error) {
    if (error instanceof ScanUploadError)
      return apiError(error.status, 'INVALID_IMAGE', error.message);
    if (error instanceof z.ZodError || error instanceof TypeError)
      return apiError(400, 'INVALID_INPUT', '图片或保存参数无效。');
    console.error('[scan-save] save failed', error);
    // Photos remain in the client batch for retry or saving without a SKU selection.
    return apiError(
      409,
      'SAVE_FAILED',
      '保存未完成。识别过期时请重新匹配，或选择暂存为未鉴定。',
    );
  }
}
