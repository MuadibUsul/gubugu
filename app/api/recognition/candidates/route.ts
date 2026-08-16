import { NextResponse } from 'next/server';

import {
  recognitionErrorResponseSchema,
  recognitionRequestMetadataSchema,
  recognitionUploadLimits,
} from '@/lib/recognition';
import { recognizeGoodsImage } from '@/server/recognition/service';

function buildErrorResponse({
  code,
  message,
  retryable,
  status,
}: {
  code:
    | 'INVALID_PAYLOAD'
    | 'MISSING_IMAGE'
    | 'UNSUPPORTED_IMAGE_TYPE'
    | 'IMAGE_TOO_LARGE'
    | 'INTERNAL_ERROR';
  message: string;
  retryable: boolean;
  status: number;
}) {
  return NextResponse.json(
    recognitionErrorResponseSchema.parse({
      ok: false,
      requestId: crypto.randomUUID(),
      error: {
        code,
        message,
        retryable,
      },
    }),
    {
      status,
    },
  );
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return buildErrorResponse({
      code: 'INVALID_PAYLOAD',
      message: '请求必须是包含图片字段的 multipart form data。',
      retryable: false,
      status: 400,
    });
  }

  const rawSource = formData.get('source');
  const rawCaptureMode = formData.get('captureMode');
  const metadata = recognitionRequestMetadataSchema.safeParse({
    source:
      typeof rawSource === 'string' && rawSource.length > 0
        ? rawSource
        : undefined,
    captureMode:
      typeof rawCaptureMode === 'string' && rawCaptureMode.length > 0
        ? rawCaptureMode
        : undefined,
  });

  if (!metadata.success) {
    return buildErrorResponse({
      code: 'INVALID_PAYLOAD',
      message: metadata.error.issues[0]?.message ?? '识别元数据无效。',
      retryable: false,
      status: 400,
    });
  }

  const image = formData.get('image');

  if (!(image instanceof File) || image.size <= 0) {
    return buildErrorResponse({
      code: 'MISSING_IMAGE',
      message: '请上传一张图片后再请求识别候选。',
      retryable: false,
      status: 400,
    });
  }

  if (!image.type.startsWith(recognitionUploadLimits.acceptedMimePrefix)) {
    return buildErrorResponse({
      code: 'UNSUPPORTED_IMAGE_TYPE',
      message: '识别接口只接受图片文件上传。',
      retryable: false,
      status: 415,
    });
  }

  if (image.size > recognitionUploadLimits.maxFileSizeBytes) {
    return buildErrorResponse({
      code: 'IMAGE_TOO_LARGE',
      message: '上传图片大小不能超过 10 MB。',
      retryable: false,
      status: 413,
    });
  }

  try {
    const response = await recognizeGoodsImage({
      file: image,
      source: metadata.data.source,
      captureMode: metadata.data.captureMode,
    });

    return NextResponse.json(response, {
      status: 200,
    });
  } catch (error) {
    // The response deliberately says nothing specific, so without this the
    // failure leaves no trace anywhere and a 500 here is undebuggable.
    console.error('[recognition] 识别失败', error);

    return buildErrorResponse({
      code: 'INTERNAL_ERROR',
      message: '识别服务暂时不可用，请稍后重试。',
      retryable: true,
      status: 500,
    });
  }
}
