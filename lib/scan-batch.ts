import { z } from 'zod';

export const MAX_SCAN_BATCH = 10;
export const scanSaveInputSchema = z
  .object({
    captureId: z.string().uuid(),
    requestId: z.string().uuid().nullable(),
    candidateId: z.string().uuid().nullable(),
  })
  .refine((input) => !input.candidateId || Boolean(input.requestId), {
    message: '确认商品需要有效的识别记录。',
  });

export function frameChanged(previous: number[], current: number[]) {
  if (!previous.length || previous.length !== current.length) return true;
  const difference = current.reduce(
    (sum, value, i) => sum + Math.abs(value - previous[i]),
    0,
  );
  return difference / current.length > 18;
}
