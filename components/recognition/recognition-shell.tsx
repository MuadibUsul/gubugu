'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RecognitionCandidateCard } from '@/components/recognition/recognition-candidate-card';
import type { RecognitionCandidate } from '@/lib/recognition';
import { confirmRecognitionCandidateAction } from '@/server/recognition/actions';

// 相机优先的自动扫描：进入即开相机、全屏取景 + 扫描光效，点快门直接识别并自动入库。
// 高置信匹配自动点亮；中置信展示少量候选，由用户确认；未匹配保存为私密未鉴定项。
// 相机是唯一输入（不再有上传）。

type Phase =
  | 'starting'
  | 'live'
  | 'scanning'
  | 'candidates'
  | 'matched'
  | 'unmatched'
  | 'offline'
  | 'denied'
  | 'error';

type ScanResult = {
  goodsSlug?: string;
  goodsName?: string;
  score?: number | null;
  requestId?: string;
  scanId?: string | null;
  candidates?: RecognitionCandidate[];
};

// 取景框 4:5，把源画面按此比例居中裁切。
function clampFrameSize(sw: number, sh: number) {
  const target = 4 / 5;
  if (sw / sh > target) {
    const w = sh * target;
    return { sx: (sw - w) / 2, sy: 0, sw: w, sh };
  }
  const h = sw / target;
  return { sx: 0, sy: (sh - h) / 2, sw, sh: h };
}

export function RecognitionShell() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const phaseRef = useRef<Phase>('starting');

  const [phase, setPhase] = useState<Phase>('starting');
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setResult(null);
    setShotUrl(null);
    setPendingCandidateId(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setPhase('error');
      setErrorMessage('当前环境不支持相机。');
      return;
    }
    if (!navigator.onLine) {
      setPhase('offline');
      setErrorMessage('当前处于离线状态，联网后可以继续扫描。');
      return;
    }
    setPhase('starting');
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1440 },
          height: { ideal: 1920 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPhase('live');
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' ||
          error.name === 'PermissionDeniedError')
      ) {
        setPhase('denied');
        return;
      }
      setPhase('error');
      setErrorMessage(
        error instanceof DOMException &&
          (error.name === 'NotFoundError' ||
            error.name === 'DevicesNotFoundError')
          ? '没有检测到可用相机。'
          : error instanceof DOMException && error.name === 'NotReadableError'
            ? '相机正被其他应用占用，请关闭后重试。'
            : error instanceof Error
              ? error.message
              : '相机启动失败。',
      );
    }
  }, [stopCamera]);

  // 进入即开相机。
  useEffect(() => {
    const startFrame = window.requestAnimationFrame(() => void startCamera());
    return () => {
      window.cancelAnimationFrame(startFrame);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // WebView 切后台时释放摄像头；恢复前台或网络恢复后重新建立流。
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopCamera();
      } else if (
        phaseRef.current === 'live' ||
        phaseRef.current === 'starting'
      ) {
        void startCamera();
      }
    };
    const handleOffline = () => {
      stopCamera();
      setPhase('offline');
      setErrorMessage('网络已断开，恢复连接后可以继续扫描。');
    };
    const handleOnline = () => {
      if (phaseRef.current === 'offline') void startCamera();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [startCamera, stopCamera]);

  // 点快门：抓帧 → 上传自动识别入库。
  const scan = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    const f = clampFrameSize(video.videoWidth, video.videoHeight);
    canvas.width = 960;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
      video,
      f.sx,
      f.sy,
      f.sw,
      f.sh,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const url = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setShotUrl(url);
    setPhase('scanning');
    setErrorMessage(null);

    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `scan-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      const body = new FormData();
      body.set('image', file);
      body.set('source', 'camera');
      const res = await fetch('/api/recognition/scan', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setPhase('error');
        setErrorMessage(data?.message ?? '扫描失败，请重试。');
        return;
      }
      if (data.matched) {
        setResult({
          goodsSlug: data.goodsSlug,
          goodsName: data.goodsName,
          score: data.score,
        });
        setPhase('matched');
      } else if (data.tier === 'candidates' && data.candidates?.length) {
        setResult({
          requestId: data.requestId,
          scanId: data.scanId,
          score: data.score,
          candidates: data.candidates,
        });
        setPhase('candidates');
      } else {
        setResult({ score: data.score });
        setPhase('unmatched');
      }
    } catch (error) {
      setPhase('error');
      setErrorMessage(
        error instanceof Error ? error.message : '扫描请求失败。',
      );
    }
  }, [stopCamera]);

  const confirmCandidate = useCallback(
    async (candidate: RecognitionCandidate) => {
      if (!result?.requestId || pendingCandidateId) return;
      setPendingCandidateId(candidate.id);
      const confirmed = await confirmRecognitionCandidateAction({
        requestId: result.requestId,
        candidateId: candidate.id,
        ...(result.scanId ? { scanId: result.scanId } : {}),
      });

      if (confirmed.success) {
        setResult({
          goodsSlug: confirmed.goodsSlug,
          goodsName: candidate.goods.name,
          score: Math.round(candidate.score * 100),
        });
        setPhase('matched');
      } else {
        setErrorMessage(confirmed.message);
      }
      setPendingCandidateId(null);
    },
    [pendingCandidateId, result],
  );

  const done = phase === 'matched' || phase === 'unmatched';

  return (
    <div className="scanner">
      <canvas className="hidden" ref={canvasRef} />

      <div className="scanner__stage">
        {shotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="扫描画面" className="scanner__media" src={shotUrl} />
        ) : (
          <video
            autoPlay
            className="scanner__media"
            muted
            playsInline
            ref={videoRef}
          />
        )}
        <div className="scanner__scrim" />

        <div className="scanner__top">
          <button
            aria-label="返回"
            className="scanner__icon"
            onClick={() => router.back()}
            type="button"
          >
            ✕
          </button>
          <span className="scanner__title">扫描点亮</span>
          <span className="scanner__icon scanner__icon--ghost" aria-hidden />
        </div>

        {phase === 'live' || phase === 'starting' ? (
          <div className="scanner__frame">
            <span className="scanner__corner scanner__corner--tl" />
            <span className="scanner__corner scanner__corner--tr" />
            <span className="scanner__corner scanner__corner--bl" />
            <span className="scanner__corner scanner__corner--br" />
            {phase === 'live' ? <span className="scanner__sweep" /> : null}
            <p className="scanner__hint">
              {phase === 'starting'
                ? '正在启动相机…'
                : '把谷子放进框里，点下方按钮'}
            </p>
          </div>
        ) : null}

        {phase === 'scanning' ? (
          <div className="scanner__center">
            <span className="scanner__pulse" />
            <p className="scanner__hint">识别中…</p>
          </div>
        ) : null}

        {phase === 'denied' || phase === 'error' || phase === 'offline' ? (
          <div className="scanner__center">
            <p className="scanner__msg">
              {phase === 'denied'
                ? '相机权限被拒绝。请在系统设置里为谷布谷开启相机后重试。'
                : (errorMessage ?? '相机出错了。')}
            </p>
            <button
              className="scanner__retry"
              onClick={() => void startCamera()}
              type="button"
            >
              重试
            </button>
          </div>
        ) : null}
      </div>

      {phase === 'live' ? (
        <div className="scanner__bottom">
          <button
            aria-label="扫描"
            className="scanner__shutter"
            onClick={() => void scan()}
            type="button"
          >
            <span className="scanner__shutter-ring" />
          </button>
        </div>
      ) : null}

      {phase === 'candidates' ? (
        <div className="scanner__sheet">
          <p className="scanner__result-badge">找到几个可能的官方 SKU</p>
          <p className="scanner__result-sub scanner__result-sub--lead">
            请核对角色、系列、材质和尺寸后确认。相似度只是检索信号，不代表真伪鉴定。
          </p>
          {errorMessage ? (
            <p className="scanner__msg" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {result?.candidates?.map((candidate) => (
              <RecognitionCandidateCard
                actionMode="light"
                candidate={candidate}
                compact
                isConfirmed={false}
                isPending={pendingCandidateId === candidate.id}
                key={candidate.id}
                onConfirm={(item) => void confirmCandidate(item)}
              />
            ))}
          </div>
          <div className="scanner__result-actions">
            <button
              className="scanner__btn"
              onClick={() => void startCamera()}
              type="button"
            >
              都不像，重新拍摄
            </button>
            <Link className="scanner__btn" href="/me/collection#unverified">
              暂存到谷柜
            </Link>
          </div>
        </div>
      ) : done ? (
        <div className="scanner__sheet">
          {phase === 'matched' ? (
            <>
              <p className="scanner__result-badge scanner__result-badge--ok">
                ✦ 已点亮
              </p>
              <p className="scanner__result-title">{result?.goodsName}</p>
              <p className="scanner__result-sub">
                匹配官方谷子 · 匹配度 {result?.score}% · 已收进谷柜并可公开展示
              </p>
              <div className="scanner__result-actions">
                {result?.goodsSlug ? (
                  <Link
                    className="scanner__btn scanner__btn--primary"
                    href={`/goods/${result.goodsSlug}?lighting=success`}
                  >
                    查看谷子
                  </Link>
                ) : null}
                <button
                  className="scanner__btn"
                  onClick={() => void startCamera()}
                  type="button"
                >
                  继续扫描
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="scanner__result-badge">已收入谷柜 · 未鉴定</p>
              <p className="scanner__result-sub scanner__result-sub--lead">
                没匹配到官方谷子，已作为你的收藏保存；未鉴定项不会在公开主页展示。
              </p>
              <div className="scanner__result-actions">
                <button
                  className="scanner__btn scanner__btn--primary"
                  onClick={() => void startCamera()}
                  type="button"
                >
                  继续扫描
                </button>
                <Link className="scanner__btn" href="/me/collection">
                  去谷柜
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
