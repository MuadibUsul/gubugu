'use client';

import { useEffect, useRef } from 'react';

import styles from './holo-card.module.css';

/**
 * 交互式全息卡。逻辑移植自 simeydotme/pokemon-cards-css 的 Card.svelte：
 * 指针/触摸/陀螺仪 → 计算旋转/箔面/眩光目标值，用一个 rAF 阻尼 lerp 平滑趋近
 * （近似 Svelte 的 spring），静止后自动停帧。单张大卡、只在交互时逐帧，故不卡。
 */

function clamp(v: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}
function adjust(
  v: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
) {
  return toMin + ((toMax - toMin) * (v - fromMin)) / (fromMax - fromMin);
}

type SpringState = {
  rx: number;
  ry: number;
  gx: number;
  gy: number;
  o: number;
  bx: number;
  by: number;
  trx: number;
  tryy: number;
  tgx: number;
  tgy: number;
  to: number;
  tbx: number;
  tby: number;
  active: boolean;
};

const REST = { rx: 0, ry: 0, gx: 50, gy: 50, o: 0, bx: 50, by: 50 };

export function HoloCard({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const s = useRef<SpringState>({
    ...REST,
    trx: 0,
    tryy: 0,
    tgx: 50,
    tgy: 50,
    to: 0,
    tbx: 50,
    tby: 50,
    active: false,
  });

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const write = () => {
      const c = s.current;
      const fromCenter = clamp(
        Math.hypot(c.gx - 50, c.gy - 50) / 50,
        0,
        1,
      );
      el.style.setProperty('--pointer-x', `${c.gx}%`);
      el.style.setProperty('--pointer-y', `${c.gy}%`);
      el.style.setProperty('--pointer-from-center', `${fromCenter}`);
      el.style.setProperty('--pointer-from-top', `${c.gy / 100}`);
      el.style.setProperty('--pointer-from-left', `${c.gx / 100}`);
      el.style.setProperty('--card-opacity', `${c.o}`);
      el.style.setProperty('--rotate-x', `${c.rx}deg`);
      el.style.setProperty('--rotate-y', `${c.ry}deg`);
      el.style.setProperty('--background-x', `${c.bx}%`);
      el.style.setProperty('--background-y', `${c.by}%`);
    };

    const tick = () => {
      const c = s.current;
      const k = c.active ? 0.15 : 0.08;
      c.rx += (c.trx - c.rx) * k;
      c.ry += (c.tryy - c.ry) * k;
      c.gx += (c.tgx - c.gx) * k;
      c.gy += (c.tgy - c.gy) * k;
      c.o += (c.to - c.o) * k;
      c.bx += (c.tbx - c.bx) * k;
      c.by += (c.tby - c.by) * k;
      write();
      const settled =
        Math.abs(c.trx - c.rx) +
          Math.abs(c.tryy - c.ry) +
          Math.abs(c.tgx - c.gx) +
          Math.abs(c.tgy - c.gy) +
          Math.abs(c.to - c.o) * 100 +
          Math.abs(c.tbx - c.bx) +
          Math.abs(c.tby - c.by) <
        0.4;
      if (settled) {
        rafRef.current = null;
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    const kick = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    };

    const setFromPercent = (px: number, py: number) => {
      const c = s.current;
      const cx = px - 50;
      const cy = py - 50;
      c.active = true;
      c.tbx = adjust(px, 0, 100, 37, 63);
      c.tby = adjust(py, 0, 100, 33, 67);
      c.trx = -(cx / 3.5);
      c.tryy = cy / 3.5;
      c.tgx = px;
      c.tgy = py;
      c.to = 1;
      el.dataset.active = 'true';
      kick();
    };

    const rest = () => {
      const c = s.current;
      c.active = false;
      c.trx = REST.rx;
      c.tryy = REST.ry;
      c.tgx = REST.gx;
      c.tgy = REST.gy;
      c.to = REST.o;
      c.tbx = REST.bx;
      c.tby = REST.by;
      el.dataset.active = 'false';
      kick();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = clamp(((e.clientX - rect.left) / rect.width) * 100);
      const py = clamp(((e.clientY - rect.top) / rect.height) * 100);
      setFromPercent(px, py);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const rect = el.getBoundingClientRect();
      const px = clamp(((t.clientX - rect.left) / rect.width) * 100);
      const py = clamp(((t.clientY - rect.top) / rect.height) * 100);
      setFromPercent(px, py);
    };

    // 陀螺仪：手机倾斜也能流转箔面（与库 orientate 同样的映射）
    let gyroBase: { g: number; b: number } | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      if (!gyroBase) gyroBase = { g: e.gamma, b: e.beta };
      const limit = { x: 16, y: 18 };
      const gx = clamp(e.gamma - gyroBase.g, -limit.x, limit.x);
      const gy = clamp(e.beta - gyroBase.b, -limit.y, limit.y);
      const c = s.current;
      c.active = true;
      c.tbx = adjust(gx, -limit.x, limit.x, 37, 63);
      c.tby = adjust(gy, -limit.y, limit.y, 33, 67);
      c.trx = gx * -1;
      c.tryy = gy;
      c.tgx = adjust(gx, -limit.x, limit.x, 0, 100);
      c.tgy = adjust(gy, -limit.y, limit.y, 0, 100);
      c.to = 1;
      el.dataset.active = 'true';
      kick();
    };

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerleave', rest);
    el.addEventListener('pointercancel', rest);
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', rest);
    el.addEventListener('touchcancel', rest);

    const coarse =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coarse && !reduce) {
      window.addEventListener('deviceorientation', onOrient);
    }

    write();

    return () => {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerleave', rest);
      el.removeEventListener('pointercancel', rest);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', rest);
      el.removeEventListener('touchcancel', rest);
      window.removeEventListener('deviceorientation', onOrient);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <div
      className={`${styles.card} ${className ?? ''}`}
      data-active="false"
      ref={cardRef}
    >
      <div className={styles.rotator}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={alt} className={styles.art} src={src} />
        <span aria-hidden="true" className={styles.shine} />
        <span aria-hidden="true" className={styles.glare} />
      </div>
    </div>
  );
}
