'use client';

import { Capacitor } from '@capacitor/core';
import Image from 'next/image';
import { useEffect, useState } from 'react';

// 注册 Service Worker + 安装引导。挂在根 layout（可水合）里。
// Android/桌面：捕获 beforeinstallprompt，弹「安装到主屏」；iOS Safari：给「分享→添加到主屏幕」提示。
// 关闭后记 localStorage，不再打扰。

type InstallEvent = Event & { prompt: () => Promise<void> };

const DISMISS_KEY = 'gbg-install-dismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function PwaProvider() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    // Android 空闲时提前初始化轻量扫描器；扫描页复用同一个实例。
    const scannerWarmup = Capacitor.isNativePlatform()
      ? window.setTimeout(() => {
          void import('@/components/recognition/scanner-runtime').then(
            ({ ensureScanner }) => ensureScanner().catch(() => undefined),
          );
        }, 1500)
      : null;

    if (localStorage.getItem(DISMISS_KEY) || isStandalone()) {
      return () => {
        if (scannerWarmup !== null) window.clearTimeout(scannerWarmup);
      };
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|android/i.test(ua);
    const hintFrame =
      isIos && isSafari
        ? window.requestAnimationFrame(() => setIosHint(true))
        : null;

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      if (hintFrame !== null) window.cancelAnimationFrame(hintFrame);
      if (scannerWarmup !== null) window.clearTimeout(scannerWarmup);
    };
  }, []);

  if (!deferred && !iosHint) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDeferred(null);
    setIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    dismiss();
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-[560px] px-4 lg:bottom-4">
      <div className="flex items-center gap-3 rounded-[16px] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-float)]">
        <Image
          alt=""
          className="size-9 rounded-[10px]"
          height={36}
          src="/icons/icon-192.png"
          width={36}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">把谷布谷装进主屏</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
            {iosHint
              ? '点底部「分享」→「添加到主屏幕」，像 App 一样打开。'
              : '一步安装，全屏打开，扫描点亮更顺手。'}
          </p>
        </div>
        {deferred ? (
          <button
            className="shrink-0 rounded-[12px] bg-[var(--shu)] px-3.5 py-2 text-xs font-bold text-[var(--shu-ink)]"
            onClick={install}
            type="button"
          >
            安装
          </button>
        ) : null}
        <button
          aria-label="关闭"
          className="text-muted-foreground shrink-0 px-1 text-lg leading-none"
          onClick={dismiss}
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  );
}
