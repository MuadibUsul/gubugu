'use client';

import { useEffect } from 'react';

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

type OrientPermissionCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/**
 * 手机端全息：一个挂在 :root 上的陀螺仪监听器，按手机角度写 --px/--py，
 * 页面里所有全息卡（通过继承 :root 的 --px/--py）一起随手机倾斜流转箔面。
 * 仅触摸设备启用；Android 免授权，iOS 首次点一下屏幕授权。挂一次即可。
 */
export function HoloGyro() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    let raf = 0;
    let baseGamma: number | null = null;
    let baseBeta: number | null = null;
    let tx = 0.5;
    let ty = 0.5;
    let cx = 0.5;
    let cy = 0.5;
    let got = false;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      got = true;
      root.dataset.gyro = '1';
      if (baseGamma == null) {
        baseGamma = e.gamma;
        baseBeta = e.beta;
      }
      tx = 0.5 + clamp((e.gamma - baseGamma) / 28, -1, 1) * 0.5;
      ty = 0.5 + clamp((e.beta - (baseBeta ?? 0)) / 28, -1, 1) * 0.5;
    };

    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      if (got) {
        root.style.setProperty('--px', cx.toFixed(4));
        root.style.setProperty('--py', cy.toFixed(4));
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      window.addEventListener('deviceorientation', onOrient);
      raf = requestAnimationFrame(tick);
    };

    const DOE = window.DeviceOrientationEvent as OrientPermissionCtor | undefined;
    let cleanupAsk: (() => void) | undefined;
    if (DOE && typeof DOE.requestPermission === 'function') {
      const ask = () => {
        DOE.requestPermission?.()
          .then((s) => {
            if (s === 'granted') start();
          })
          .catch(() => undefined);
      };
      window.addEventListener('touchend', ask, { once: true });
      cleanupAsk = () => window.removeEventListener('touchend', ask);
    } else {
      start();
    }

    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      cleanupAsk?.();
      if (raf) cancelAnimationFrame(raf);
      delete root.dataset.gyro;
      root.style.removeProperty('--px');
      root.style.removeProperty('--py');
    };
  }, []);

  return null;
}
