'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

type GoodsShareCardProps = {
  goodsName: string;
  goodsSlug: string;
  /** 传入后触发器渲染成动作图标格（用于详情页的一行图标）。 */
  triggerClassName?: string;
};

type PendingAction = 'share' | 'save' | 'copy' | null;

export function GoodsShareCard({
  goodsName,
  goodsSlug,
  triggerClassName,
}: GoodsShareCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<File | null>(null);
  const filePromiseRef = useRef<Promise<File> | null>(null);
  const mountedRef = useRef(true);
  const previewUrlRef = useRef<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [cardState, setCardState] = useState<'idle' | 'loading' | 'ready'>(
    'idle',
  );
  const [feedback, setFeedback] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imagePath = `/goods/${encodeURIComponent(goodsSlug)}/share`;
  const filename = `谷布谷-${goodsSlug}.png`;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function getCanonicalUrl() {
    return new URL(
      `/goods/${encodeURIComponent(goodsSlug)}`,
      window.location.origin,
    ).toString();
  }

  function openDialog() {
    setFeedback('');
    dialogRef.current?.showModal();
    void prepareShareFile().catch(() => undefined);
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function prepareShareFile() {
    if (fileRef.current) {
      setCardState('ready');
      return Promise.resolve(fileRef.current);
    }

    if (!filePromiseRef.current) {
      setCardState('loading');
      filePromiseRef.current = fetch(imagePath)
        .then((response) => {
          if (!response.ok) throw new Error('谷卡生成失败');
          return response.blob();
        })
        .then((blob) => {
          const file = new File([blob], filename, { type: 'image/png' });

          if (!mountedRef.current) return file;

          const objectUrl = URL.createObjectURL(file);
          fileRef.current = file;
          previewUrlRef.current = objectUrl;
          setPreviewUrl(objectUrl);
          setCardState('ready');
          return file;
        })
        .catch((error: unknown) => {
          filePromiseRef.current = null;
          if (mountedRef.current) {
            setCardState('idle');
            setFeedback('谷卡生成失败，请稍后再试；你仍可复制链接分享。');
          }
          throw error;
        });
    }

    return filePromiseRef.current;
  }

  function downloadFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }

  async function saveImage() {
    setPendingAction('save');
    setFeedback('');

    try {
      downloadFile(await prepareShareFile());
      setFeedback('高清谷卡已下载。如果没有进入相册，请长按左侧预览图保存。');
    } catch {
      setFeedback('保存失败，请稍后再试。');
    } finally {
      setPendingAction(null);
    }
  }

  async function shareImage() {
    setPendingAction('share');
    setFeedback('');

    try {
      const file = fileRef.current;
      const url = getCanonicalUrl();

      if (
        file &&
        window.isSecureContext &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file] });
        setFeedback('图片已交给系统分享面板；是否发布由目标应用决定。');
      } else if (typeof navigator.share === 'function') {
        await navigator.share({
          title: `${goodsName}｜谷布谷图鉴`,
          text: `分享一件想收藏的谷子：${goodsName}`,
          url,
        });
        setFeedback('当前浏览器只能分享链接；可保存高清图后发布到社交平台。');
      } else if (file) {
        downloadFile(file);
        setFeedback('当前浏览器不支持系统分享，已为你保存高清谷卡。');
      } else {
        setFeedback('谷卡仍在生成，请稍后再试。');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFeedback('已取消分享，或当前没有可用的分享目标。');
      } else {
        setFeedback('分享失败，可以先保存高清图再发布。');
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function copyLink() {
    setPendingAction('copy');
    setFeedback('');

    try {
      await navigator.clipboard.writeText(getCanonicalUrl());
      setFeedback('SKU 链接已复制。');
    } catch {
      setFeedback('复制失败，请从浏览器地址栏复制链接。');
    } finally {
      setPendingAction(null);
    }
  }

  const shareIcon = (
    <svg width="21" height="21" viewBox="0 0 256 256" fill="currentColor">
      <path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,0,0,176,160Z" />
    </svg>
  );

  return (
    <>
      {triggerClassName ? (
        <button
          aria-label={`分享「${goodsName}」谷卡`}
          className={triggerClassName}
          onClick={openDialog}
          onFocus={() => void prepareShareFile().catch(() => undefined)}
          onPointerEnter={() => void prepareShareFile().catch(() => undefined)}
          type="button"
        >
          {shareIcon}
          <span>分享</span>
        </button>
      ) : (
        <Button
          aria-label={`分享「${goodsName}」谷卡`}
          className="w-full sm:ml-auto sm:w-auto"
          onClick={openDialog}
          onFocus={() => void prepareShareFile().catch(() => undefined)}
          onPointerEnter={() => void prepareShareFile().catch(() => undefined)}
          size="sm"
          type="button"
          variant="outline"
        >
          <span aria-hidden="true">↗</span>
          分享谷卡
        </Button>
      )}

      <dialog
        aria-describedby="goods-share-description"
        aria-labelledby="goods-share-title"
        className="mt-auto mb-0 max-h-[96dvh] w-full max-w-[560px] overflow-hidden rounded-t-[28px] border border-[var(--rule)] bg-[var(--surface)] p-0 text-[var(--ink)] shadow-[0_32px_100px_rgba(52,31,63,.3)] backdrop:bg-[rgba(30,26,20,.7)] sm:m-auto sm:w-[min(92vw,560px)] sm:rounded-[28px]"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        ref={dialogRef}
      >
        <div className="flex max-h-[94dvh] min-w-0 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,.92),transparent_42%),linear-gradient(145deg,var(--violet-soft),var(--shu-soft))] p-3 sm:p-5">
            {previewUrl ? (
              // This object URL reuses the generated File; it avoids a second
              // 1.25 MB request just for the modal preview.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${goodsName} 的谷子分享卡预览`}
                className="mx-auto aspect-[3/4] max-h-[calc(94dvh-168px)] w-auto rounded-[22px] bg-white object-contain shadow-[0_22px_70px_rgba(69,42,82,.25)]"
                src={previewUrl}
              />
            ) : (
              <div
                aria-label="正在生成谷卡预览"
                className="mx-auto grid aspect-[3/4] h-[min(64dvh,640px)] max-h-[calc(94dvh-168px)] place-items-center rounded-[22px] border border-[var(--rule)] bg-white/70 p-8 text-center text-sm text-[var(--ink-2)] shadow-[0_22px_70px_rgba(69,42,82,.2)]"
                role="status"
              >
                正在生成谷卡…
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--rule)] bg-[var(--surface)] px-4 pt-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base leading-tight" id="goods-share-title">
                  分享这张收藏谷卡
                </h2>
                <p
                  aria-live="polite"
                  className="mt-1 truncate text-xs text-[var(--ink-2)]"
                  role="status"
                >
                  {feedback || goodsName}
                </p>
              </div>
              <p className="shrink-0 text-[11px] text-[var(--ink-3)]">
                1080 × 1440 PNG
              </p>
              <button
                aria-label="关闭分享谷卡"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--rule)] bg-[var(--surface)] text-xl transition-transform duration-150 ease-[var(--ease)] active:scale-[.96] motion-reduce:transform-none"
                onClick={closeDialog}
                type="button"
              >
                ×
              </button>
            </div>

            <p className="sr-only" id="goods-share-description">
              手机支持时可打开系统分享面板；如果微信或抖音没有出现，先保存图片再发布即可。
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button
                className="px-2 text-xs sm:text-sm"
                disabled={pendingAction !== null || cardState !== 'ready'}
                onClick={shareImage}
                type="button"
              >
                {cardState === 'loading'
                  ? '生成中…'
                  : pendingAction === 'share'
                    ? '打开中…'
                    : '系统分享'}
              </Button>
              <Button
                className="px-2 text-xs sm:text-sm"
                disabled={pendingAction !== null}
                onClick={saveImage}
                type="button"
                variant="secondary"
              >
                {pendingAction === 'save' ? '下载中…' : '保存图片'}
              </Button>
              <Button
                className="px-2 text-xs sm:text-sm"
                disabled={pendingAction !== null}
                onClick={copyLink}
                type="button"
                variant="ghost"
              >
                {pendingAction === 'copy' ? '复制中…' : '复制链接'}
              </Button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
