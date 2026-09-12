import { isAcceptedImageMimeType } from '@/lib/image-upload';
import { recognitionUploadLimits } from '@/lib/recognition';

export class ScanUploadError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function readScanForm(request: Request) {
  const maximum = recognitionUploadLimits.maxFileSizeBytes * 2 + 64 * 1024;
  if (Number(request.headers.get('content-length')) > maximum)
    throw new ScanUploadError('正反面图片合计过大。', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ScanUploadError('缺少图片。');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new ScanUploadError('正反面图片合计过大。', 413);
      }
      chunks.push(value);
    }
    return await new Response(Buffer.concat(chunks), {
      headers: {
        'Content-Type': request.headers.get('content-type') ?? '',
      },
    }).formData();
  } finally {
    reader.releaseLock();
  }
}

export function scanImageFile(value: FormDataEntryValue | null): File {
  if (!(value instanceof File) || !value.size)
    throw new ScanUploadError('缺少图片。');
  if (!isAcceptedImageMimeType(value.type))
    throw new ScanUploadError('仅支持 JPG、PNG、WebP 图片。', 415);
  if (value.size > recognitionUploadLimits.maxFileSizeBytes)
    throw new ScanUploadError('每面图片不能超过 10 MB。', 413);
  return value;
}
