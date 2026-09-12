'use client';

import { Capacitor } from '@capacitor/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RecognitionCandidateCard } from '@/components/recognition/recognition-candidate-card';
import {
  detectCardFrame,
  ensureScanner,
  extractCardFrame,
  fingerprintCard,
  getCoverSourceRect,
  type ScannerCorners,
} from '@/components/recognition/scanner-runtime';
import type { RecognitionCandidate } from '@/lib/recognition';
import { frameChanged } from '@/lib/scan-batch';
import { confirmRecognitionCandidateAction } from '@/server/recognition/actions';

// 卡片采集分平台：
//  · 安卓原生 app → Google ML Kit 文档扫描（自动找边 + 自动快门 + 透视校正，出图最干净）；
//  · 微信 / iOS / 任意浏览器 → getUserMedia 取景 + Scanic 透视裁切出纯卡片。
// 两条路最终都把「裁好的卡片图」POST 给 /api/recognition/scan 走同一套识别入库逻辑。

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
  saved?: boolean;
};

// 短连拍选最清晰的一帧，边界和原图始终成对保留。
const LOCK_FRAMES = 3;
type CardCapture = {
  frame: HTMLCanvasElement;
  corners: ScannerCorners;
  sharpness: number;
};

export function RecognitionShell({
  onCapture,
  previousFrame,
  title,
  onClose,
}: {
  onCapture?: (file: File, url: string, fingerprint: number[]) => void;
  previousFrame?: number[];
  title?: string;
  onClose?: () => void;
} = {}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraGenerationRef = useRef(0);
  const phaseRef = useRef<Phase>('starting');
  const previousFrameRef = useRef(previousFrame);
  const absentFramesRef = useRef(0);
  const captureFingerprintRef = useRef<number[]>([]);
  // startCamera 定义在 scanNative 之后；回退时用这个 ref 回调它，避开先用后声明。
  const startCameraRef = useRef<(() => void) | null>(null);
  // 实时找边循环的状态。放 ref 里，避免每帧触发 re-render。
  const detectRef = useRef<{
    running: boolean;
    timer: number | null;
    stable: number;
    autoBlocked: boolean;
    lastCorners: ScannerCorners | null;
    best: CardCapture | null;
  }>({
    running: false,
    timer: null,
    stable: 0,
    autoBlocked: false,
    lastCorners: null,
    best: null,
  });
  const pendingScanFileRef = useRef<File | null>(null);

  const [isNative] = useState(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  });
  // Android 默认直接使用 WebView 实时取景。国内机型普遍没有完整 Google Play
  // 服务，而 ML Kit 路径在真正启动前只能显示黑色占位区，看起来像相机坏了。
  // getUserMedia + Scanic 不依赖 GMS，并且能让用户在按快门前确认构图。
  const [webFallback, setWebFallback] = useState(() => {
    if (isNative) return true;
    try {
      return localStorage.getItem('gubugu.scanMode') === 'web';
    } catch {
      return false;
    }
  });
  const webFallbackRef = useRef(webFallback);
  useEffect(() => {
    webFallbackRef.current = webFallback;
  }, [webFallback]);
  // 是否走网页相机路径：非原生，或原生但无 GMS 已回退。
  const useWebCamera = !isNative || webFallback;
  const [phase, setPhase] = useState<Phase>('starting');
  // 实时取景引导语；网页找边循环会动态改写它。
  const [guide, setGuide] = useState('把整张卡片放进取景框');
  const [locking, setLocking] = useState(false);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // 停止实时找边循环并清掉锁定计数。
  const stopDetection = useCallback(() => {
    const st = detectRef.current;
    st.running = false;
    if (st.timer !== null) {
      window.clearTimeout(st.timer);
      st.timer = null;
    }
    st.stable = 0;
    st.lastCorners = null;
    st.best = null;
    setLocking(false);
  }, []);

  const stopCamera = useCallback(() => {
    cameraGenerationRef.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // 裁好的卡片图上传识别 + 处理结果（原生/网页两条路共用）。
  const uploadAndHandle = useCallback(
    async (
      file: File,
      previewUrl: string | null,
      saveUnidentified = false,
      captureMode: 'manual' | 'auto' = 'manual',
    ) => {
      if (onCapture && previewUrl) {
        onCapture(file, previewUrl, captureFingerprintRef.current);
        return;
      }
      pendingScanFileRef.current = file;
      setShotUrl(previewUrl);
      setPhase('scanning');
      setErrorMessage(null);
      try {
        const body = new FormData();
        body.set('image', file);
        body.set('source', 'camera');
        body.set('captureMode', captureMode);
        if (saveUnidentified) body.set('saveUnidentified', 'true');
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
            saved: data.saved,
          });
          setPhase('candidates');
        } else {
          setResult({
            requestId: data.requestId,
            scanId: data.scanId,
            score: data.score,
            saved: data.saved,
          });
          setPhase('unmatched');
        }
      } catch (error) {
        setPhase('error');
        setErrorMessage(
          error instanceof Error ? error.message : '扫描请求失败。',
        );
      }
    },
    [onCapture],
  );

  const saveAsUnidentified = useCallback(() => {
    const file = pendingScanFileRef.current;
    if (!file) {
      setErrorMessage('原始画面已失效，请重新拍摄。');
      return;
    }
    void uploadAndHandle(file, shotUrl, true);
  }, [shotUrl, uploadAndHandle]);

  // 原生：Google ML Kit 文档扫描（全屏、自动找边 + 自动快门 + 透视校正）。
  const scanNative = useCallback(async () => {
    setErrorMessage(null);
    setResult(null);
    setShotUrl(null);
    try {
      const { DocumentScanner } =
        await import('@capacitor-mlkit/document-scanner');
      const { scannedImages } = await DocumentScanner.scanDocument({
        galleryImportAllowed: true,
        pageLimit: 1,
        resultFormats: 'JPEG',
        scannerMode: 'FULL',
      });
      const uri = scannedImages?.[0];
      if (!uri) {
        setPhase('live');
        return;
      }
      const src = Capacitor.convertFileSrc(uri);
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], `scan-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      await uploadAndHandle(file, src);
    } catch (error) {
      // 用户取消不算错误
      const msg = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(msg)) {
        setPhase('live');
        return;
      }
      // ML Kit 依赖 Google Play 服务；没有 GMS / 模块下载失败时，一次性回退到网页
      // 相机路径（不依赖谷歌），并记住选择，之后直接走网页取景，不再踩这个坑。
      webFallbackRef.current = true;
      setWebFallback(true);
      try {
        localStorage.setItem('gubugu.scanMode', 'web');
      } catch {
        /* noop */
      }
      setErrorMessage('检测不到谷歌服务，已切换到内置扫描。');
      startCameraRef.current?.();
    }
  }, [uploadAndHandle]);

  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setResult(null);
    setShotUrl(null);
    setPendingCandidateId(null);
    if (isNative && !webFallbackRef.current) {
      // 有 GMS 的原生：不用 getUserMedia 预览，交给 ML Kit 全屏扫描；这里只呈现启动屏。
      setPhase('live');
      return;
    }
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
    const generation = cameraGenerationRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1440 },
          height: { ideal: 1920 },
        },
      });
      if (generation !== cameraGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPhase('live');
      // 预热轻量扫描器，快门时无需等待。
      void ensureScanner().catch(() => undefined);
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
  }, [isNative, stopCamera]);

  // scanNative 的回退需要回调 startCamera（它声明在后面），用 ref 转一手。
  useEffect(() => {
    startCameraRef.current = () => void startCamera();
  }, [startCamera]);

  // 进入即开相机（原生则进入启动屏）。
  useEffect(() => {
    const startFrame = window.requestAnimationFrame(() => void startCamera());
    return () => {
      window.cancelAnimationFrame(startFrame);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // WebView 切后台释放摄像头；恢复后重建（网页路径，含原生无 GMS 回退）。
  useEffect(() => {
    if (!useWebCamera) return;
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
  }, [useWebCamera, startCamera, stopCamera]);

  // 可见画面保留框外余量，用于寻找完整卡片边界。
  const snapshot = useCallback(() => {
    const video = videoRef.current;
    const guideElement = frameRef.current;
    if (!video?.videoWidth || !guideElement) return null;
    const view = video.getBoundingClientRect();
    const box = guideElement.getBoundingClientRect();
    if (!view.width || !view.height || !box.width || !box.height) return null;
    const source = getCoverSourceRect(
      video.videoWidth,
      video.videoHeight,
      view.width,
      view.height,
      { x: 0, y: 0, width: view.width, height: view.height },
    );
    const frame = document.createElement('canvas');
    frame.width = Math.min(1000, Math.round(source.sw));
    frame.height = Math.round((source.sh * frame.width) / source.sw);
    const ctx = frame.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(
      video,
      source.sx,
      source.sy,
      source.sw,
      source.sh,
      0,
      0,
      frame.width,
      frame.height,
    );
    return {
      frame,
      guide: {
        x: ((box.left - view.left) * frame.width) / view.width,
        y: ((box.top - view.top) * frame.height) / view.height,
        width: (box.width * frame.width) / view.width,
        height: (box.height * frame.height) / view.height,
      },
    };
  }, []);

  // 自动采集裁切已验证的那一帧，不再对另一张照片重新找边。
  const scan = useCallback(
    async (
      captureMode: 'manual' | 'auto' = 'manual',
      capture?: CardCapture,
    ) => {
      if (phaseRef.current !== 'live') return;
      const shot = capture ? null : snapshot();
      if (!capture && !shot) return;
      phaseRef.current = 'scanning';
      stopDetection();
      stopCamera();
      const generation = cameraGenerationRef.current;
      setPhase('scanning');
      setErrorMessage(null);
      try {
        const frame = capture?.frame ?? shot!.frame;
        let corners = capture?.corners;
        if (!corners && shot) {
          const detected = await detectCardFrame(frame, shot.guide).catch(
            () => null,
          );
          corners = detected?.corners;
        }
        let output: HTMLCanvasElement;
        if (corners) {
          captureFingerprintRef.current = fingerprintCard(frame, corners);
          output = await extractCardFrame(frame, corners);
        } else {
          // 手动快门找边失败时仍可保留框内原图。
          output = document.createElement('canvas');
          const guide = shot!.guide;
          captureFingerprintRef.current = fingerprintCard(frame, {
            topLeftCorner: { x: guide.x, y: guide.y },
            topRightCorner: { x: guide.x + guide.width, y: guide.y },
            bottomRightCorner: {
              x: guide.x + guide.width,
              y: guide.y + guide.height,
            },
            bottomLeftCorner: { x: guide.x, y: guide.y + guide.height },
          });
          output.width = Math.round(guide.width);
          output.height = Math.round(guide.height);
          output
            .getContext('2d')
            ?.drawImage(
              frame,
              guide.x,
              guide.y,
              guide.width,
              guide.height,
              0,
              0,
              output.width,
              output.height,
            );
        }
        const url = output.toDataURL('image/jpeg', 0.95);
        const blob = await (await fetch(url)).blob();
        if (generation !== cameraGenerationRef.current) return;
        const file = new File([blob], `scan-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        await uploadAndHandle(file, url, false, captureMode);
      } catch (error) {
        setPhase('error');
        setErrorMessage(
          error instanceof Error ? error.message : '卡片裁切失败，请重试。',
        );
      }
    },
    [snapshot, stopCamera, stopDetection, uploadAndHandle],
  );

  const detectTick = useCallback(async () => {
    const st = detectRef.current;
    const schedule = () => {
      if (st.running)
        st.timer = window.setTimeout(() => void detectTick(), 200);
    };
    if (!st.running || phaseRef.current !== 'live') return;
    const shot = snapshot();
    if (!shot) {
      schedule();
      return;
    }
    const detected = await detectCardFrame(shot.frame, shot.guide).catch(
      () => null,
    );
    if (!st.running || phaseRef.current !== 'live') return;
    if (!detected) {
      absentFramesRef.current += 1;
      if (absentFramesRef.current >= 2) previousFrameRef.current = undefined;
      st.stable = 0;
      st.best = null;
      st.lastCorners = null;
      setLocking(false);
      setGuide('将卡片放在框内，停一下即可');
      schedule();
      return;
    }
    absentFramesRef.current = 0;
    if (
      previousFrameRef.current &&
      !frameChanged(
        previousFrameRef.current,
        fingerprintCard(shot.frame, detected.corners),
      )
    ) {
      st.stable = 0;
      st.best = null;
      setLocking(false);
      setGuide('已拍好，请换下一件或补拍背面');
      schedule();
      return;
    }
    const previous = st.lastCorners;
    const moved = previous
      ? Math.max(
          ...Object.entries(detected.corners).map(([key, point]) => {
            const last = previous[key as keyof ScannerCorners];
            return Math.hypot(
              (point.x - last.x) / shot.frame.width,
              (point.y - last.y) / shot.frame.height,
            );
          }),
        )
      : 0;
    st.lastCorners = detected.corners;
    if (moved > 0.035) {
      st.stable = 0;
      st.best = null;
    }
    st.stable += 1;
    if (!st.best || detected.sharpness > st.best.sharpness) {
      st.best = { frame: shot.frame, ...detected };
    }
    setLocking(true);
    setGuide('拿稳，正在采集…');
    if (st.stable >= LOCK_FRAMES && !st.autoBlocked) {
      st.autoBlocked = true;
      void scan('auto', st.best);
      return;
    }
    schedule();
  }, [scan, snapshot]);

  const startDetection = useCallback(() => {
    if (!useWebCamera) return;
    const st = detectRef.current;
    if (st.running) return;
    st.running = true;
    st.autoBlocked = false;
    st.stable = 0;
    st.lastCorners = null;
    st.best = null;
    setGuide('将卡片放在框内，停一下即可');
    st.timer = window.setTimeout(() => void detectTick(), 300);
  }, [detectTick, useWebCamera]);

  // 网页取景就绪就开始自动找边；离开 live（识别中/结果/卸载）即停。
  useEffect(() => {
    if (useWebCamera && phase === 'live') {
      startDetection();
    } else {
      stopDetection();
    }
    return () => stopDetection();
  }, [phase, useWebCamera, startDetection, stopDetection]);

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
  // 快门：有 GMS 的原生走 ML Kit；网页（含原生无 GMS 回退）走 getUserMedia 抓帧。
  const onShutter = useWebCamera ? scan : scanNative;

  return (
    <div className="scanner">
      <div className="scanner__stage">
        {shotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="扫描画面" className="scanner__media" src={shotUrl} />
        ) : useWebCamera ? (
          <video
            autoPlay
            className="scanner__media"
            muted
            playsInline
            ref={videoRef}
          />
        ) : (
          <div className="scanner__media scanner__media--native" />
        )}
        <div className="scanner__scrim" />

        <div className="scanner__top">
          <button
            aria-label="返回"
            className="scanner__icon"
            onClick={() => (onClose ? onClose() : router.back())}
            type="button"
          >
            ✕
          </button>
          <span className="scanner__title">{title ?? '扫描点亮'}</span>
          <span className="scanner__icon scanner__icon--ghost" aria-hidden />
        </div>

        {phase === 'live' || phase === 'starting' ? (
          <div className="scanner__frame" data-locking={locking} ref={frameRef}>
            <span className="scanner__corner scanner__corner--tl" />
            <span className="scanner__corner scanner__corner--tr" />
            <span className="scanner__corner scanner__corner--bl" />
            <span className="scanner__corner scanner__corner--br" />
            <p className="scanner__hint">
              {phase === 'starting'
                ? '正在启动相机…'
                : useWebCamera
                  ? guide
                  : '点下方按钮开始扫描 · 对准卡片后会自动拍摄 · 正反面各扫一次'}
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
            aria-label={useWebCamera ? '手动拍摄' : '开始扫描'}
            className="scanner__shutter"
            onClick={() => void onShutter()}
            type="button"
          >
            <span className="scanner__shutter-ring" />
          </button>
          {useWebCamera ? (
            <span className="scanner__bottom-note">
              发现完整卡片会自动扫描 · 也可手动按
            </span>
          ) : null}
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
            <button
              className="scanner__btn"
              onClick={saveAsUnidentified}
              type="button"
            >
              保存为未鉴定
            </button>
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
              <p className="scanner__result-badge">
                {result?.saved ? '已收入谷柜 · 未鉴定' : '未找到可靠候选'}
              </p>
              <p className="scanner__result-sub scanner__result-sub--lead">
                {result?.saved
                  ? '已按你的选择保存为未鉴定收藏，仅自己可见。'
                  : '这张照片尚未保存。请确认画面里确实有谷子，再决定是否收入未鉴定收藏。'}
              </p>
              <div className="scanner__result-actions">
                <button
                  className={`scanner__btn${result?.saved ? 'scanner__btn--primary' : ''}`}
                  onClick={() => void startCamera()}
                  type="button"
                >
                  {result?.saved ? '继续扫描' : '重新拍摄'}
                </button>
                {result?.saved ? (
                  <Link className="scanner__btn" href="/me/collection">
                    去谷柜
                  </Link>
                ) : (
                  <button
                    className="scanner__btn"
                    onClick={saveAsUnidentified}
                    type="button"
                  >
                    保存为未鉴定
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
