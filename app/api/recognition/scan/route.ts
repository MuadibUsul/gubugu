import { NextResponse } from 'next/server';

import { isAcceptedImageMimeType } from '@/lib/image-upload';
import { consumeServerWrite } from '@/lib/rate-limit';
import { isMobileUserAgent } from '@/lib/device';
import {
  recognitionUploadLimits,
  shouldRetryAutomaticCapture,
} from '@/lib/recognition';
import { getAuthUser } from '@/server/auth/session';
import { confirmRecognitionAttempt } from '@/server/recognition/confirm';
import { recognizeGoodsImage } from '@/server/recognition/service';
import { gradeRecognition } from '@/server/recognition/thresholds';
import { recordUnidentifiedScan } from '@/server/user-scans/record';

// 扫描识别：拍一张 → 匹配官方谷库。分档见 lib/recognition.ts：
//   高置信      → 服务端直接确认并点亮（可公开展示）
//   有可靠候选  → 交给 /recognition 让用户挑，这里不擅自点亮
//   无可靠候选  → 先返回结果；只有用户明确选择暂存才写入未鉴定收藏
// 点亮走 confirmRecognitionAttempt，与用户手动确认候选是同一段事务。

function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  // 与识别流程一致：仅手机端。
  if (!isMobileUserAgent(request.headers.get('user-agent'))) {
    return new NextResponse(null, { status: 404 });
  }

  const user = await getAuthUser();
  if (!user) return fail(401, '请登录后使用扫描。');
  if (
    !consumeServerWrite(`${user.id}:recognition-scan`, {
      limit: 20,
      windowMs: 60_000,
    })
  ) {
    return fail(429, '扫描过于频繁，请稍后重试。');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(400, '请求必须是包含图片的 multipart form data。');
  }

  const image = formData.get('image');
  const saveUnidentified = formData.get('saveUnidentified') === 'true';
  const captureMode =
    formData.get('captureMode') === 'auto' ? 'auto' : 'manual';
  if (!(image instanceof File) || image.size <= 0) {
    return fail(400, '缺少图片。');
  }
  if (!isAcceptedImageMimeType(image.type)) {
    return fail(415, '仅接受 JPG、PNG 或 WebP 图片。');
  }
  if (image.size > recognitionUploadLimits.maxFileSizeBytes) {
    return fail(413, '图片不能超过 10 MB。');
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());

    const response = await recognizeGoodsImage({
      file: image,
      userId: user.id,
      source: 'camera',
    });

    const top = response.candidates[0];
    const tier = gradeRecognition(top?.score);
    const score = top ? Math.round(top.score * 100) : null;

    if (tier === 'auto-light' && top) {
      // 与手动确认完全同路：资格、过期、幂等、SKU 解析、审计、成就、缓存刷新
      // 都在里面，SKU 由服务端从 attempt 的 candidate_map 解析。
      const confirmed = await confirmRecognitionAttempt({
        userId: user.id,
        requestId: response.requestId,
        candidateId: top.id,
      });

      if (confirmed.success) {
        return NextResponse.json({
          ok: true,
          matched: true,
          goodsSlug: confirmed.goodsSlug,
          goodsName: top.goods.name,
          score,
        });
      }

      // 分数够但确认没通过（SKU 下架、记录不合格等）：不当作失败，落为未鉴定项，
      // 用户的这一张照片不会白拍。
      console.error('[recognition] 自动点亮未通过确认', confirmed.code);
    }

    const hasReliableCandidates =
      tier === 'candidates' &&
      response.pipeline.provider === 'embedding-search';

    // 自动快门发现的轮廓若连可靠候选都没有，视为环境误检：不保存、不打断用户，
    // 让客户端回到取景并等待画面明显变化后重新布防。
    if (
      shouldRetryAutomaticCapture({
        captureMode,
        tier,
        provider: response.pipeline.provider,
      })
    ) {
      return NextResponse.json({
        ok: true,
        matched: false,
        tier: 'unidentified',
        retry: true,
        saved: false,
        scanId: null,
        requestId: response.requestId,
        score,
        candidates: [],
      });
    }

    // 候选档不在这里点亮，把有限候选交给用户确认。未鉴定照片也不默认入库：
    // 背景、包装盒等低置信画面没有收藏价值，只有用户明确选择暂存才保存。
    // 角色识别：即便没到点亮阈值，也把最接近候选的角色/IP 作为初始备注存下，
    // 让「未鉴定收藏」也能显示「疑似：<角色> · <IP>」。仅真实向量检索、且有角色时给。
    const guessNote =
      top &&
      response.pipeline.provider === 'embedding-search' &&
      top.goods.characterNames.length > 0
        ? `疑似：${top.goods.characterNames.join('、')}${
            top.goods.ipName ? ` · ${top.goods.ipName}` : ''
          }`
        : null;

    const { scanId } = saveUnidentified
      ? await recordUnidentifiedScan({
          userId: user.id,
          image: buffer,
          recognitionAttemptId: response.requestId,
          topScore: score,
          note: guessNote,
        })
      : { scanId: null };

    return NextResponse.json({
      ok: true,
      matched: false,
      tier: saveUnidentified
        ? 'unidentified'
        : hasReliableCandidates
          ? 'candidates'
          : 'unidentified',
      saved: Boolean(scanId),
      scanId,
      requestId: response.requestId,
      score,
      candidates:
        !saveUnidentified && hasReliableCandidates
          ? response.candidates.slice(0, 3)
          : [],
    });
  } catch (error) {
    console.error('[recognition] 扫描失败', error);
    return fail(500, '扫描服务暂时不可用，请稍后重试。');
  }
}
