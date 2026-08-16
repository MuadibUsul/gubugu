'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RecognitionCandidatesPanel } from '@/components/recognition/recognition-candidates-panel';
import { Button } from '@/components/ui/button';
import {
  type RecognitionCandidate,
  recognitionResponseSchema,
  type RecognitionSuccessResponse,
} from '@/lib/recognition';

type CameraState =
  | 'idle'
  | 'requesting'
  | 'live'
  | 'preview'
  | 'unsupported'
  | 'denied'
  | 'error';
type ResultState = 'idle' | 'processing' | 'ready' | 'error';
type PreviewSource = 'camera' | 'upload' | null;
type CaptureMode = 'manual' | 'auto' | null;

const pipelineSteps = [
  {
    key: 'capture',
    label: '取景拍摄',
    description: '把物品放进取景框内，生成一张静态图片。',
  },
  {
    key: 'upload',
    label: '上传识别',
    description: '把图片发送到识别服务。',
  },
  {
    key: 'match',
    label: '候选匹配',
    description: '返回候选结果。',
  },
  {
    key: 'confirm',
    label: '确认',
    description: '确认目标 SKU。',
  },
] as const;

// Placeholder results must not be presented as real matches. The warning text
// says so too, but the header label is what a user reads first.
function getProviderLabel(response: RecognitionSuccessResponse | null) {
  if (!response) {
    return '等待识别';
  }

  return response.pipeline.provider === 'embedding-search'
    ? '图像特征匹配'
    : '占位结果 · 非真实识别';
}

function clampFrameSize(sourceWidth: number, sourceHeight: number) {
  const targetRatio = 4 / 5;
  const sourceRatio = sourceWidth / sourceHeight;

  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio;

    return {
      sx: (sourceWidth - width) / 2,
      sy: 0,
      sw: width,
      sh: sourceHeight,
    };
  }

  const height = sourceWidth / targetRatio;

  return {
    sx: 0,
    sy: (sourceHeight - height) / 2,
    sw: sourceWidth,
    sh: height,
  };
}

function getCameraStatusCopy(state: CameraState, errorMessage: string | null) {
  switch (state) {
    case 'requesting':
      return '正在请求相机权限。';
    case 'live':
      return '相机已启动。你可以手动拍摄，或启用自动拍摄。';
    case 'preview':
      return '预览已生成。';
    case 'unsupported':
      return '当前浏览器不支持相机访问，请改用上传图片。';
    case 'denied':
      return '相机权限被拒绝。请改用上传方式，或在浏览器设置里重新开启权限。';
    case 'error':
      return errorMessage ?? '相机启动失败，请改用上传方式。';
    default:
      return '启动相机或上传一张图片后继续。';
  }
}

function getResultHeadline(state: ResultState) {
  switch (state) {
    case 'processing':
      return '候选匹配中';
    case 'ready':
      return '结果已返回';
    case 'error':
      return '候选请求失败';
    default:
      return '等待输入';
  }
}

async function previewUrlToFile(
  previewUrl: string,
  source: PreviewSource,
): Promise<File> {
  const response = await fetch(previewUrl);
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : 'jpg';
  const fileName =
    source === 'camera'
      ? `recognition-capture-${Date.now()}.${extension}`
      : `recognition-upload-${Date.now()}.${extension}`;

  return new File([blob], fileName, {
    type: blob.type || 'image/jpeg',
  });
}

export function RecognitionShell() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadPreviewUrlRef = useRef<string | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [resultState, setResultState] = useState<ResultState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recognitionResponse, setRecognitionResponse] =
    useState<RecognitionSuccessResponse | null>(null);
  const [confirmedCandidateId, setConfirmedCandidateId] = useState<
    string | null
  >(null);

  const statusCopy = getCameraStatusCopy(cameraState, errorMessage);
  const resultHeadline = getResultHeadline(resultState);
  const candidateItems = recognitionResponse?.candidates ?? [];

  const captureModeLabel = useMemo(() => {
    if (previewSource === 'upload') {
      return '上传预览';
    }

    if (previewSource === 'camera') {
      return captureMode === 'auto' ? '自动拍摄预览' : '手动拍摄预览';
    }

    if (cameraState === 'live') {
      return '相机实时取景';
    }

    return '等待取景';
  }, [cameraState, captureMode, previewSource]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }

      if (uploadPreviewUrlRef.current) {
        URL.revokeObjectURL(uploadPreviewUrlRef.current);
      }

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  function resetResult() {
    setResultState('idle');
    setRecognitionResponse(null);
    setConfirmedCandidateId(null);
  }

  function stopCamera() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function clearUploadPreviewUrl() {
    if (uploadPreviewUrlRef.current) {
      URL.revokeObjectURL(uploadPreviewUrlRef.current);
      uploadPreviewUrlRef.current = null;
    }
  }

  async function startCamera() {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraSupported(false);
      setCameraState('unsupported');
      return;
    }

    if (!cameraSupported) {
      setCameraState('unsupported');
      return;
    }

    setErrorMessage(null);
    setCountdown(null);
    setCaptureMode(null);
    resetResult();
    stopCamera();
    setCameraState('requesting');

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

      setPreviewUrl(null);
      setPreviewSource(null);
      setCapturedAt(null);
      setCameraState('live');
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' ||
          error.name === 'PermissionDeniedError')
      ) {
        setCameraState('denied');
        setErrorMessage(null);
        return;
      }

      setCameraState('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '无法启动相机，请改用上传方式。',
      );
    }
  }

  const captureFrame = useCallback(
    (source: Exclude<PreviewSource, null>, mode: CaptureMode) => {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;

      if (!videoElement || !canvasElement || videoElement.videoWidth === 0) {
        setErrorMessage('相机实时画面还没有准备好。');
        setCameraState('error');
        setCountdown(null);
        return;
      }

      const frame = clampFrameSize(
        videoElement.videoWidth,
        videoElement.videoHeight,
      );

      canvasElement.width = 960;
      canvasElement.height = 1200;

      const context = canvasElement.getContext('2d');

      if (!context) {
        setErrorMessage('无法创建预览画布。');
        setCameraState('error');
        setCountdown(null);
        return;
      }

      context.clearRect(0, 0, canvasElement.width, canvasElement.height);
      context.drawImage(
        videoElement,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        0,
        0,
        canvasElement.width,
        canvasElement.height,
      );

      const url = canvasElement.toDataURL('image/jpeg', 0.92);

      stopCamera();
      clearUploadPreviewUrl();
      setPreviewUrl(url);
      setPreviewSource(source);
      setCaptureMode(mode);
      setCapturedAt(new Date());
      resetResult();
      setCameraState('preview');
      setCountdown(null);
      setErrorMessage(null);
    },
    [],
  );

  function handleArmAutoCapture() {
    if (cameraState !== 'live') {
      return;
    }

    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }

    const tick = (value: number) => {
      setCountdown(value);

      if (value <= 0) {
        countdownTimerRef.current = setTimeout(() => {
          captureFrame('camera', 'auto');
          countdownTimerRef.current = null;
        }, 220);
        return;
      }

      countdownTimerRef.current = setTimeout(() => {
        tick(value - 1);
      }, 1000);
    };

    tick(3);
  }

  function handleCancelCountdown() {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    setCountdown(null);
  }

  function handleOpenUpload() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearUploadPreviewUrl();
    stopCamera();

    const objectUrl = URL.createObjectURL(file);
    uploadPreviewUrlRef.current = objectUrl;

    setPreviewUrl(objectUrl);
    setPreviewSource('upload');
    setCaptureMode(null);
    setCapturedAt(new Date());
    resetResult();
    setCameraState('preview');
    setCountdown(null);
    setErrorMessage(null);
    event.target.value = '';
  }

  function handleRetake() {
    setPreviewUrl(null);
    setPreviewSource(null);
    setCaptureMode(null);
    setCapturedAt(null);
    setCountdown(null);
    setErrorMessage(null);
    resetResult();

    if (previewSource === 'upload') {
      clearUploadPreviewUrl();
      setCameraState(cameraSupported ? 'idle' : 'unsupported');
      return;
    }

    void startCamera();
  }

  async function handleConfirmPreview() {
    if (!previewUrl || !previewSource) {
      return;
    }

    setResultState('processing');
    setRecognitionResponse(null);
    setErrorMessage(null);

    try {
      const file = await previewUrlToFile(previewUrl, previewSource);
      const formData = new FormData();

      formData.set('image', file);
      formData.set('source', previewSource);

      if (captureMode) {
        formData.set('captureMode', captureMode);
      }

      const response = await fetch('/api/recognition/candidates', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      const parsed = recognitionResponseSchema.safeParse(payload);

      if (!parsed.success) {
        throw new Error('识别返回结果格式无效。');
      }

      if (!parsed.data.ok) {
        setResultState('error');
        setErrorMessage(parsed.data.error.message);
        return;
      }

      setRecognitionResponse(parsed.data);
      setConfirmedCandidateId(parsed.data.candidates[0]?.id ?? null);
      setResultState('ready');
    } catch (error) {
      setResultState('error');
      setErrorMessage(
        error instanceof Error ? error.message : '识别请求失败。',
      );
    }
  }

  const handleConfirmCandidate = useCallback(
    (candidate: RecognitionCandidate) => {
      setConfirmedCandidateId(candidate.id);

      if (!recognitionResponse) {
        return;
      }

      const params = new URLSearchParams({
        recognized: '1',
        recognitionRequestId: recognitionResponse.requestId,
        recognitionSource: recognitionResponse.image.source,
        recognitionCandidateId: candidate.id,
      });

      if (recognitionResponse.image.captureMode) {
        params.set(
          'recognitionCaptureMode',
          recognitionResponse.image.captureMode,
        );
      }

      router.push(`/goods/${candidate.goods.slug}?${params.toString()}`);
    },
    [recognitionResponse, router],
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
      <div className="collection-panel relative overflow-hidden p-5 sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_88%,white)_0%,color-mix(in_oklab,var(--background)_94%,var(--card))_100%)]" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
                拍摄阶段
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                识别取景台
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                {captureModeLabel}
              </span>
              <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                {resultState === 'ready'
                  ? '结果已就绪'
                  : resultState === 'processing'
                    ? '识别中'
                    : resultState === 'error'
                      ? '请求失败'
                      : '等待中'}
              </span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(280px,0.84fr)]">
            <div className="space-y-4">
              <div className="border-border/70 bg-background/78 relative overflow-hidden rounded-[var(--radius)] border p-3">
                <div className="recognition-grid border-border/60 relative aspect-[4/5] overflow-hidden rounded-[var(--radius)] border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_90%,white),color-mix(in_oklab,var(--card)_86%,var(--background)))]">
                  {previewUrl ? (
                    <Image
                      alt="识别预览图"
                      className="object-cover"
                      fill
                      sizes="(max-width: 1280px) 100vw, 54rem"
                      src={previewUrl}
                      unoptimized
                    />
                  ) : cameraState === 'live' || cameraState === 'requesting' ? (
                    <video
                      autoPlay
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      ref={videoRef}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                      <div className="border-border/70 bg-card/78 flex size-20 items-center justify-center rounded-full border text-2xl">
                        ◎
                      </div>
                      <div className="space-y-2">
                        <p className="font-heading text-foreground text-3xl leading-none">
                          等待输入
                        </p>
                        <p className="text-muted-foreground text-sm">
                          启动相机或上传图片。
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,color-mix(in_oklab,var(--background)_52%,transparent)_100%)]" />
                  <div className="pointer-events-none absolute inset-[11%] rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--accent)_70%,white)]">
                    <div className="absolute -top-px -left-px h-12 w-12 rounded-tl-[1.8rem] border-t-2 border-l-2 border-[color:color-mix(in_oklab,var(--accent)_86%,white)]" />
                    <div className="absolute -top-px -right-px h-12 w-12 rounded-tr-[1.8rem] border-t-2 border-r-2 border-[color:color-mix(in_oklab,var(--accent)_86%,white)]" />
                    <div className="absolute -bottom-px -left-px h-12 w-12 rounded-bl-[1.8rem] border-b-2 border-l-2 border-[color:color-mix(in_oklab,var(--accent)_86%,white)]" />
                    <div className="absolute -right-px -bottom-px h-12 w-12 rounded-br-[1.8rem] border-r-2 border-b-2 border-[color:color-mix(in_oklab,var(--accent)_86%,white)]" />
                    {cameraState === 'live' && countdown === null ? (
                      <div className="recognition-scan-line absolute inset-x-5 top-5 bottom-5 overflow-hidden rounded-[var(--radius)]" />
                    ) : null}
                  </div>

                  <div className="pointer-events-none absolute top-4 left-4">
                    <span className="border-border/70 bg-background/74 text-foreground inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase">
                      取景框
                    </span>
                  </div>

                  <div className="pointer-events-none absolute right-4 bottom-4 left-4 flex items-center justify-between gap-4">
                    <span className="border-border/70 bg-background/74 text-muted-foreground inline-flex rounded-full border px-3 py-1 text-xs">
                      尽量居中。
                    </span>
                    {countdown !== null ? (
                      <span className="border-border/70 bg-background/74 text-foreground inline-flex min-w-16 items-center justify-center rounded-full border px-4 py-1 text-sm font-semibold">
                        {countdown}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <canvas className="hidden" ref={canvasRef} />

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="border-border/70 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
                  <p className="text-muted-foreground text-[0.66rem] uppercase">
                    当前状态
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-7">
                    {statusCopy}
                  </p>
                </div>
                <div className="border-border/70 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
                  <p className="text-muted-foreground text-[0.66rem] uppercase">
                    预览时间
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-7">
                    {capturedAt
                      ? capturedAt.toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '尚未生成预览'}
                  </p>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="border-border/70 bg-background/76 rounded-[var(--radius)] border p-5">
                <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                  输入控制
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      void startCamera();
                    }}
                    type="button"
                  >
                    启动相机
                  </Button>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      disabled={cameraState !== 'live' || countdown !== null}
                      onClick={() => captureFrame('camera', 'manual')}
                      type="button"
                      variant="secondary"
                    >
                      立即拍摄
                    </Button>
                    {countdown === null ? (
                      <Button
                        disabled={cameraState !== 'live'}
                        onClick={handleArmAutoCapture}
                        type="button"
                        variant="outline"
                      >
                        自动拍摄
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCancelCountdown}
                        type="button"
                        variant="outline"
                      >
                        取消倒计时
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={handleOpenUpload}
                    type="button"
                    variant="outline"
                  >
                    上传图片
                  </Button>

                  <input
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    type="file"
                  />
                </div>
              </div>

              <div className="border-border/70 bg-background/76 rounded-[var(--radius)] border p-5">
                <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                  预览
                </p>
                <div className="mt-4 grid gap-3">
                  <Button
                    disabled={!previewUrl || resultState === 'processing'}
                    onClick={handleConfirmPreview}
                    type="button"
                  >
                    确认预览并请求候选
                  </Button>
                  <Button
                    disabled={!previewUrl}
                    onClick={handleRetake}
                    type="button"
                    variant="secondary"
                  >
                    {previewSource === 'upload' ? '清空预览' : '重新拍摄'}
                  </Button>
                </div>
              </div>

              <div className="border-border/70 bg-background/76 rounded-[var(--radius)] border border-dashed p-5">
                <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                  上传入口
                </p>
                <p className="text-muted-foreground mt-3 text-sm">
                  相机不可用时可直接上传。
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <section className="collection-panel p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
                  进度
                </p>
                <h2 className="font-heading text-foreground text-4xl leading-none">
                  {resultHeadline}
                </h2>
              </div>
              <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
                {recognitionResponse ? '候选识别' : '等待识别'}
              </span>
            </div>

            <div className="grid gap-3">
              {pipelineSteps.map((step, index) => {
                const isActive =
                  (index === 0 && previewUrl) ||
                  (index === 1 && previewUrl) ||
                  (index === 2 && resultState !== 'idle') ||
                  (index === 3 && resultState === 'ready');

                return (
                  <div
                    className={
                      isActive
                        ? 'rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--accent)_58%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,white)] px-4 py-4'
                        : 'border-border/70 bg-background/78 rounded-[var(--radius)] border px-4 py-4'
                    }
                    key={step.key}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-foreground text-sm font-semibold">
                          {step.label}
                        </p>
                        <p className="text-muted-foreground mt-2 text-sm leading-6">
                          {step.description}
                        </p>
                      </div>
                      <span className="border-border/70 bg-card/78 text-muted-foreground inline-flex size-9 items-center justify-center rounded-full border text-xs font-semibold">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <RecognitionCandidatesPanel
          candidates={candidateItems}
          confirmedCandidateId={confirmedCandidateId}
          errorMessage={errorMessage}
          onConfirmCandidate={handleConfirmCandidate}
          onRetake={handleRetake}
          providerLabel={getProviderLabel(recognitionResponse)}
          resultState={resultState}
          warnings={recognitionResponse?.warnings ?? []}
        />
      </aside>
    </section>
  );
}
