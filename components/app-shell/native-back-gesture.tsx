'use client';

import { useEffect } from 'react';

type BackButtonEvent = { canGoBack?: boolean };
type PluginHandle = { remove: () => void } | Promise<{ remove: () => void }>;
type CapacitorAppPlugin = {
  addListener: (
    event: 'backButton',
    cb: (e: BackButtonEvent) => void,
  ) => PluginHandle;
  minimizeApp?: () => void;
  exitApp?: () => void;
};
type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  Plugins?: { App?: CapacitorAppPlugin };
};

/**
 * 安卓返回手势 / 硬件返回键的统一处理。
 *
 * 现象：从屏幕左缘向右滑（安卓手势导航的「返回」）时，WebView 没有任何监听，
 * Capacitor 默认直接退出整个 App——用户以为是返回，结果闪退出去。
 *
 * 处理：Capacitor 会把原生桥注入到远端页面（server.url 指向云端），所以在 Web 端
 * 直接用 window.Capacitor.Plugins.App 监听 backButton 即可，无需重打 APK、随云端部署生效。
 *   · 页内还能返回（canGoBack / history.length>1）→ 走 history.back()，回到上一页；
 *   · 已经在栈底（比如首页/某个 Tab 根）→ minimizeApp() 把 App 收到后台，
 *     跟系统里其它 App 一样，而不是直接杀掉进程。
 * 仅原生壳里生效；纯浏览器/PWA 下 window.Capacitor 不存在，直接跳过。
 */
export function NativeBackGesture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cap = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const app = cap.Plugins?.App;
    if (!app?.addListener) return;

    let handle: { remove: () => void } | undefined;
    let cancelled = false;

    const registration = app.addListener('backButton', (e) => {
      const canGoBack = e?.canGoBack ?? window.history.length > 1;
      if (canGoBack) {
        window.history.back();
      } else if (app.minimizeApp) {
        app.minimizeApp();
      } else {
        app.exitApp?.();
      }
    });

    Promise.resolve(registration).then((h) => {
      if (cancelled) {
        h.remove();
      } else {
        handle = h;
      }
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);

  return null;
}
