'use client';

import { Capacitor } from '@capacitor/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RecognitionCandidateCard } from '@/components/recognition/recognition-candidate-card';
import type { RecognitionCandidate } from '@/lib/recognition';
import { confirmRecognitionCandidateAction } from '@/server/recognition/actions';

// 卡片采集分平台：
//  · 安卓原生 app → Google ML Kit 文档扫描（自动找边 + 自动快门 + 透视校正，出图最干净）；
//  · 微信 / iOS / 任意浏览器 → getUserMedia 取景 + jscanify(OpenCV.js) 透视裁切出纯卡片。
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
};

// 取景框 4:5，把源画面按此比例居中裁切（jscanify 找不到卡时的兜底）。
function clampFrameSize(sw: number, sh: number) {
  const target = 4 / 5;
  if (sw / sh > target) {
    const w = sh * target;
    return { sx: (sw - w) / 2, sy: 0, sw: w, sh };
  }
  const h = sw / target;
  return { sx: 0, sy: (sh - h) / 2, sw, sh: h };
}

// 惰性加载 OpenCV.js（仅非原生回退路径需要，~8MB，只加载一次）。
let openCvPromise: Promise<void> | null = null;
function ensureOpenCV(): Promise<void> {
  if (openCvPromise) return openCvPromise;
  openCvPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as { cv?: { Mat?: unknown; onRuntimeInitialized?: () => void } };
    if (w.cv?.Mat) return resolve();
    const finish = () => {
      if (w.cv?.Mat) resolve();
      else if (w.cv) w.cv.onRuntimeInitialized = () => resolve();
      else reject(new Error('OpenCV 未就绪'));
    };
    const existing = document.getElementById('opencv-js') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', finish);
      existing.addEventListener('error', () => reject(new Error('OpenCV 加载失败')));
      return;
    }
    const s = document.createElement('script');
    s.id = 'opencv-js';
    s.async = true;
    s.src = 'https://docs.opencv.org/4.10.0/opencv.js';
    s.onload = finish;
    s.onerror = () => reject(new Error('OpenCV 加载失败'));
    document.head.appendChild(s);
  });
  return openCvPromise;
}

// jscanify 客户端实例只建一次；实时找边和快门裁切共用。
let scannerPromise: Promise<import('jscanify/client').default> | null = null;
function ensureScanner() {
  if (!scannerPromise) {
    scannerPromise = (async () => {
      await ensureOpenCV();
      // 必须用浏览器构建；默认入口是 node 构建会 require('canvas')/jsdom 打包失败。
      const Jscanify = (await import('jscanify/client')).default;
      return new Jscanify();
    })();
  }
  return scannerPromise;
}

// 只用到 imread（取一个可 delete 的 Mat）。运行期由 opencv.js 注入。
type CvMat = { delete: () => void };
type OpenCvLike = { Mat?: unknown; imread: (el: HTMLCanvasElement) => CvMat };
function getReadyCv(): OpenCvLike | null {
  const w = window as unknown as { cv?: OpenCvLike };
  return w.cv && w.cv.Mat ? w.cv : null;
}

// 把检测帧（缩小的整帧）里的点，映射到 object-fit:cover 后视频的显示坐标。
function mapCoverPoint(
  x: number,
  y: number,
  frameW: number,
  frameH: number,
  viewW: number,
  viewH: number,
) {
  const scale = Math.max(viewW / frameW, viewH / frameH);
  const dispW = frameW * scale;
  const dispH = frameH * scale;
  return {
    x: x * scale + (viewW - dispW) / 2,
    y: y * scale + (viewH - dispH) / 2,
  };
}

// 检测帧宽度：够找边又够快。
const DETECT_W = 320;
// 连续多少帧“稳且构图合格”才自动采集（约 200ms/帧）。
const LOCK_FRAMES = 5;

export function RecognitionShell() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const detectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const phaseRef = useRef<Phase>('starting');
  // 实时找边循环的状态。放 ref 里，避免每帧触发 re-render。
  const detectRef = useRef<{
    running: boolean;
    timer: number | null;
    stable: number;
    lockedShot: boolean;
    lastCenter: { x: number; y: number } | null;
  }>({ running: false, timer: null, stable: 0, lockedShot: false, lastCenter: null });

  const [isNative] = useState(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  });
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

  // 停止实时找边循环，清掉叠加层与锁定计数。
  const stopDetection = useCallback(() => {
    const st = detectRef.current;
    st.running = false;
    if (st.timer !== null) {
      window.clearTimeout(st.timer);
      st.timer = null;
    }
    st.stable = 0;
    st.lastCenter = null;
    setLocking(false);
    const overlay = overlayRef.current;
    overlay?.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // 裁好的卡片图上传识别 + 处理结果（原生/网页两条路共用）。
  const uploadAndHandle = useCallback(
    async (file: File, previewUrl: string | null) => {
      setShotUrl(previewUrl);
      setPhase('scanning');
      setErrorMessage(null);
      try {
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
        setErrorMessage(error instanceof Error ? error.message : '扫描请求失败。');
      }
    },
    [],
  );

  // 原生：Google ML Kit 文档扫描（全屏、自动找边 + 自动快门 + 透视校正）。
  const scanNative = useCallback(async () => {
    setErrorMessage(null);
    setResult(null);
    setShotUrl(null);
    try {
      const { DocumentScanner } = await import(
        '@capacitor-mlkit/document-scanner'
      );
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
      setPhase('error');
      setErrorMessage(msg || '扫描失败，请重试。');
    }
  }, [uploadAndHandle]);

  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setResult(null);
    setShotUrl(null);
    setPendingCandidateId(null);
    if (isNative) {
      // 原生不用 getUserMedia 预览，交给 ML Kit 全屏扫描；这里只呈现启动屏。
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
      // 预热 OpenCV，快门时无需等待
      void ensureOpenCV().catch(() => undefined);
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

  // 进入即开相机（原生则进入启动屏）。
  useEffect(() => {
    const startFrame = window.requestAnimationFrame(() => void startCamera());
    return () => {
      window.cancelAnimationFrame(startFrame);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // WebView 切后台释放摄像头；恢复后重建（仅非原生）。
  useEffect(() => {
    if (isNative) return;
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
  }, [isNative, startCamera, stopCamera]);

  // 非原生快门：抓全帧 → jscanify 透视裁出卡片（失败回退居中裁切）→ 上传。
  const scan = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    // 先抓整帧到离屏 canvas（尽量保原分辨率，少损失）。
    const frame = document.createElement('canvas');
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
    frame.getContext('2d')?.drawImage(video, 0, 0);

    stopDetection();
    stopCamera();
    setPhase('scanning');
    setErrorMessage(null);

    let outCanvas: HTMLCanvasElement | null = null;
    try {
      const scanner = await ensureScanner();
      // 透视裁切成卡片比例（近 0.72），高分辨率尽量无损。
      outCanvas = scanner.extractPaper(frame, 1000, 1390) as HTMLCanvasElement;
    } catch {
      outCanvas = null;
    }

    // jscanify 失败/没找到卡 → 居中 4:5 裁切兜底。
    if (!outCanvas) {
      const f = clampFrameSize(frame.width, frame.height);
      const crop = 0.82;
      const cw = f.sw * crop;
      const ch = f.sh * crop;
      canvas.width = 1000;
      canvas.height = 1250;
      canvas
        .getContext('2d')
        ?.drawImage(
          frame,
          f.sx + (f.sw - cw) / 2,
          f.sy + (f.sh - ch) / 2,
          cw,
          ch,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      outCanvas = canvas;
    }

    const url = outCanvas.toDataURL('image/jpeg', 0.95);
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], `scan-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    await uploadAndHandle(file, url);
  }, [stopCamera, stopDetection, uploadAndHandle]);

  // 实时找边一帧：在缩小帧上找卡片轮廓 → 画叠加框 + 动态引导 → 稳定合格则自动采集。
  const detectTick = useCallback(async () => {
    const st = detectRef.current;
    const schedule = () => {
      if (st.running) {
        st.timer = window.setTimeout(() => void detectTick(), 200);
      }
    };
    if (!st.running || phaseRef.current !== 'live') return;

    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || video.videoWidth === 0 || !overlay) {
      schedule();
      return;
    }

    const cv = getReadyCv();
    if (!cv) {
      setGuide('正在加载识别引擎…');
      schedule();
      return;
    }

    let scanner: import('jscanify/client').default;
    try {
      scanner = await ensureScanner();
    } catch {
      schedule();
      return;
    }
    if (!st.running || phaseRef.current !== 'live') return;

    // 缩小整帧做检测。
    const fw = video.videoWidth;
    const fh = video.videoHeight;
    const dw = DETECT_W;
    const dh = Math.max(1, Math.round((fh / fw) * dw));
    const det =
      detectCanvasRef.current ??
      (detectCanvasRef.current = document.createElement('canvas'));
    det.width = dw;
    det.height = dh;
    det.getContext('2d')?.drawImage(video, 0, 0, dw, dh);

    let corners: import('jscanify/client').JscanifyCorners | null = null;
    let img: CvMat | null = null;
    let contour: CvMat | null = null;
    try {
      img = cv.imread(det);
      contour = scanner.findPaperContour(img) as CvMat | null;
      if (contour) {
        corners = scanner.getCornerPoints(contour);
      }
    } catch {
      corners = null;
    } finally {
      // findPaperContour 返回的轮廓由调用方负责释放；img 同样。
      try {
        contour?.delete?.();
      } catch {
        /* noop */
      }
      try {
        img?.delete?.();
      } catch {
        /* noop */
      }
    }

    const tl = corners?.topLeftCorner;
    const tr = corners?.topRightCorner;
    const br = corners?.bottomRightCorner;
    const bl = corners?.bottomLeftCorner;

    // 视图（叠加层）尺寸：跟随视频显示区。
    const viewW = video.clientWidth;
    const viewH = video.clientHeight;
    if (overlay.width !== viewW || overlay.height !== viewH) {
      overlay.width = viewW;
      overlay.height = viewH;
    }
    const octx = overlay.getContext('2d');
    octx?.clearRect(0, 0, viewW, viewH);

    if (!tl || !tr || !br || !bl) {
      setGuide('把整张卡片放进取景框');
      setLocking(false);
      st.stable = 0;
      st.lastCenter = null;
      schedule();
      return;
    }

    // 四边形面积（检测帧像素）与占比、中心。
    const area =
      Math.abs(
        tl.x * tr.y -
          tr.x * tl.y +
          tr.x * br.y -
          br.x * tr.y +
          br.x * bl.y -
          bl.x * br.y +
          bl.x * tl.y -
          tl.x * bl.y,
      ) / 2;
    const coverage = area / (dw * dh);
    const cx = (tl.x + tr.x + br.x + bl.x) / 4;
    const cy = (tl.y + tr.y + br.y + bl.y) / 4;
    const offCenter = Math.hypot(cx / dw - 0.5, cy / dh - 0.5);

    // 画叠加四边形（映射到 object-fit:cover 后的显示坐标）。
    if (octx) {
      const p = (x: number, y: number) =>
        mapCoverPoint(x, y, dw, dh, viewW, viewH);
      const a = p(tl.x, tl.y);
      const b = p(tr.x, tr.y);
      const c = p(br.x, br.y);
      const d = p(bl.x, bl.y);
      const good = coverage >= 0.2 && coverage <= 0.9 && offCenter <= 0.22;
      const color = good
        ? 'rgba(201, 75, 75, 0.95)'
        : 'rgba(242, 236, 224, 0.85)';
      octx.lineWidth = 3;
      octx.strokeStyle = color;
      octx.fillStyle = 'rgba(201, 75, 75, 0.12)';
      octx.beginPath();
      octx.moveTo(a.x, a.y);
      octx.lineTo(b.x, b.y);
      octx.lineTo(c.x, c.y);
      octx.lineTo(d.x, d.y);
      octx.closePath();
      if (good) octx.fill();
      octx.stroke();
    }

    // 构图判定与引导。
    if (coverage < 0.2) {
      setGuide('把卡片靠近一点');
      setLocking(false);
      st.stable = 0;
    } else if (coverage > 0.9) {
      setGuide('离远一点，让整张卡片进框');
      setLocking(false);
      st.stable = 0;
    } else if (offCenter > 0.22) {
      setGuide('把卡片移到取景框中间');
      setLocking(false);
      st.stable = 0;
    } else {
      // 需要“稳”：中心相对上一帧位移要小。
      const moved = st.lastCenter
        ? Math.hypot((cx - st.lastCenter.x) / dw, (cy - st.lastCenter.y) / dh)
        : 1;
      st.lastCenter = { x: cx, y: cy };
      if (moved < 0.03) {
        st.stable += 1;
      } else {
        st.stable = 0;
      }
      setLocking(true);
      setGuide('拿稳，正在自动采集…');
      if (st.stable >= LOCK_FRAMES && !st.lockedShot) {
        st.lockedShot = true;
        void scan();
        return;
      }
    }

    schedule();
  }, [scan]);

  // 启动网页实时找边循环（原生走 ML Kit，不需要）。
  const startDetection = useCallback(() => {
    if (isNative) return;
    const st = detectRef.current;
    if (st.running) return;
    st.running = true;
    st.stable = 0;
    st.lockedShot = false;
    st.lastCenter = null;
    void ensureScanner().catch(() => undefined);
    st.timer = window.setTimeout(() => void detectTick(), 300);
  }, [detectTick, isNative]);

  // 网页取景就绪就开始自动找边；离开 live（识别中/结果/卸载）即停。
  useEffect(() => {
    if (!isNative && phase === 'live') {
      startDetection();
    } else {
      stopDetection();
    }
    return () => stopDetection();
  }, [phase, isNative, startDetection, stopDetection]);

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
  // 快门：原生走 ML Kit，网页走 getUserMedia 抓帧
  const onShutter = isNative ? scanNative : scan;

  return (
    <div className="scanner">
      <canvas className="hidden" ref={canvasRef} />

      <div className="scanner__stage">
        {shotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="扫描画面" className="scanner__media" src={shotUrl} />
        ) : isNative ? (
          <div className="scanner__media scanner__media--native" />
        ) : (
          <video
            autoPlay
            className="scanner__media"
            muted
            playsInline
            ref={videoRef}
          />
        )}
        {!isNative && !shotUrl ? (
          <canvas
            aria-hidden
            className="scanner__overlay"
            ref={overlayRef}
          />
        ) : null}
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
          <div
            className={`scanner__frame${locking ? ' scanner__frame--locking' : ''}`}
          >
            <span className="scanner__corner scanner__corner--tl" />
            <span className="scanner__corner scanner__corner--tr" />
            <span className="scanner__corner scanner__corner--bl" />
            <span className="scanner__corner scanner__corner--br" />
            {phase === 'live' && !isNative && !locking ? (
              <span className="scanner__sweep" />
            ) : null}
            <p className="scanner__hint">
              {phase === 'starting'
                ? '正在启动相机…'
                : isNative
                  ? '点下方按钮开始扫描 · 对准卡片会自动找边、自动拍摄 · 正反面各扫一次'
                  : guide}
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
            aria-label={isNative ? '开始扫描' : '手动拍摄'}
            className="scanner__shutter"
            onClick={() => void onShutter()}
            type="button"
          >
            <span className="scanner__shutter-ring" />
          </button>
          {!isNative ? (
            <span className="scanner__bottom-note">
              对准卡片会自动采集 · 也可手动按
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
