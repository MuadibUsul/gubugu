'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './holo-card.module.css';

/**
 * 交互式全息卡。逻辑移植自 simeydotme/pokemon-cards-css 的 Card.svelte：
 * 指针/触摸/陀螺仪 → 旋转/箔面/眩光目标值，rAF 阻尼 lerp 平滑趋近，静止即停帧。
 * 扩展：正/反两面翻转（点卡面或按钮翻面；无背面图时显示品牌卡背）+ 加载占位淡入。
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
  backSrc,
  className,
}: {
  src: string;
  alt: string;
  /** 背面图；缺省时显示品牌默认卡背（站点默认图待上传后替换）。 */
  backSrc?: string | null;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [flipped, setFlipped] = useState(false);
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
      const fromCenter = clamp(Math.hypot(c.gx - 50, c.gy - 50) / 50, 0, 1);
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
      const dist =
        Math.abs(c.trx - c.rx) +
        Math.abs(c.tryy - c.ry) +
        Math.abs(c.tgx - c.gx) +
        Math.abs(c.tgy - c.gy) +
        Math.abs(c.to - c.o) * 100 +
        Math.abs(c.tbx - c.bx) +
        Math.abs(c.tby - c.by);
      if (dist < 0.4) {
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
      setFromPercent(
        clamp(((e.clientX - rect.left) / rect.width) * 100),
        clamp(((e.clientY - rect.top) / rect.height) * 100),
      );
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const rect = el.getBoundingClientRect();
      setFromPercent(
        clamp(((t.clientX - rect.left) / rect.width) * 100),
        clamp(((t.clientY - rect.top) / rect.height) * 100),
      );
    };

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

  const flipTimer = useRef<number | null>(null);
  const toggleFlip = () => {
    const el = cardRef.current;
    if (el) {
      el.dataset.flipAnim = 'true';
      el.style.setProperty('--flip', flipped ? '0deg' : '180deg');
      // 翻面动画结束后撤掉 transform 过渡，倾斜恢复由 rAF 直接驱动（不发糊）。
      if (flipTimer.current) window.clearTimeout(flipTimer.current);
      flipTimer.current = window.setTimeout(() => {
        el.dataset.flipAnim = 'false';
      }, 600);
    }
    setFlipped((v) => !v);
  };

  return (
    <div
      className={`${styles.card} ${className ?? ''}`}
      data-active="false"
      data-flip-anim="false"
      data-loaded={loaded ? 'true' : 'false'}
      ref={cardRef}
      style={{ '--flip': '0deg' } as React.CSSProperties}
    >
      <div className={styles.rotator} onClick={toggleFlip}>
        <div className={`${styles.face} ${styles.front}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={alt}
            className={styles.art}
            fetchPriority="high"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight && cardRef.current) {
                // 用图片自身比例做卡面比例，object-fit:cover 即不裁切，原图完整显示。
                cardRef.current.style.setProperty(
                  '--card-aspect',
                  `${img.naturalWidth / img.naturalHeight}`,
                );
              }
              setLoaded(true);
            }}
            src={src}
          />
          <span aria-hidden="true" className={styles.shine} />
          <span aria-hidden="true" className={styles.glare} />
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          {backSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`${alt} 背面`} className={styles.backImg} src={backSrc} />
          ) : (
            <div className={styles.brandedBack}>
              <span className={styles.brandedBackMark}>谷</span>
              <span className={styles.brandedBackWord}>谷 布 谷</span>
            </div>
          )}
        </div>
      </div>
      <button
        aria-label={flipped ? '翻到正面' : '翻到背面'}
        className={styles.flipBtn}
        onClick={(e) => {
          e.stopPropagation();
          toggleFlip();
        }}
        type="button"
      >
        ⟲ {flipped ? '正面' : '背面'}
      </button>
    </div>
  );
}
