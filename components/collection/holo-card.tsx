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
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number | null>(null);
  // 拖动过（超过阈值）就把这次的 click 当成"转卡"而非"翻面"，避免拖完手一松就翻面。
  const draggedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [flipped, setFlipped] = useState(false);

  // 图片可能在 React 绑定 onLoad 之前就已从缓存加载完成（complete=true），
  // 那样 load 事件不会再触发、淡入永远卡在 opacity:0。挂载时补一次判断。
  const applyLoaded = (img: HTMLImageElement) => {
    if (img.naturalWidth && img.naturalHeight && cardRef.current) {
      cardRef.current.style.setProperty(
        '--card-aspect',
        `${img.naturalWidth / img.naturalHeight}`,
      );
    }
    setLoaded(true);
  };
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) applyLoaded(img);
  }, []);
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

    // 手动「拖拽自由转动」：在卡面任意按住拖动，累积角度、范围大（远超此前跟手位置的小幅
    // 倾斜），像把实体卡拿在手里转。松手缓缓回正。拖动时陀螺仪让位、且这次不触发翻面。
    const MAXY = 45; // 左右转（rotateY）最大角
    const MAXX = 32; // 上下转（rotateX）最大角
    const SENS = 0.32; // 每像素多少度
    let dragging = false;
    let sx = 0;
    let sy = 0;
    let baseTrx = 0;
    let baseTry = 0;
    let moved = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      draggedRef.current = false;
      sx = e.clientX;
      sy = e.clientY;
      baseTrx = s.current.trx;
      baseTry = s.current.tryy;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* 某些环境不支持，忽略 */
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      if (moved > 6) draggedRef.current = true;
      const c = s.current;
      c.active = true;
      c.trx = clamp(baseTrx - dx * SENS, -MAXY, MAXY);
      c.tryy = clamp(baseTry + dy * SENS, -MAXX, MAXX);
      // 反光/箔面随转动幅度走
      c.tgx = clamp(50 - c.trx * 1.6, 0, 100);
      c.tgy = clamp(50 + c.tryy * 1.9, 0, 100);
      c.tbx = adjust(c.trx, -MAXY, MAXY, 63, 37);
      c.tby = adjust(c.tryy, -MAXX, MAXX, 33, 67);
      c.to = 1;
      el.dataset.active = 'true';
      kick();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* 忽略 */
      }
      rest();
    };

    // 陀螺仪退居其次：基准自动跟随当前朝向（~1s 指数低通，解决「基准歪了」），拖动时让位。
    let gyroBase: { g: number; b: number } | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (dragging) return;
      if (e.gamma == null || e.beta == null) return;
      if (!gyroBase) {
        gyroBase = { g: e.gamma, b: e.beta };
      } else {
        gyroBase.g += (e.gamma - gyroBase.g) * 0.03;
        gyroBase.b += (e.beta - gyroBase.b) * 0.03;
      }
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

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);

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
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
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
      data-flipped={flipped ? 'true' : 'false'}
      data-loaded={loaded ? 'true' : 'false'}
      ref={cardRef}
      style={{ '--flip': '0deg' } as React.CSSProperties}
    >
      <div
        className={styles.rotator}
        onClick={() => {
          // 拖动转卡后松手不要误翻面；仅点按(未拖动)才翻面
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          toggleFlip();
        }}
      >
        <div className={`${styles.face} ${styles.front}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={alt}
            className={styles.art}
            fetchPriority="high"
            onLoad={(e) => applyLoaded(e.currentTarget)}
            ref={imgRef}
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
              <span className="absolute bottom-2 text-[10px] opacity-70">
                默认卡背 · 尚未拍摄背面
              </span>
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
        onPointerDown={(e) => e.stopPropagation()}
        type="button"
      >
        ⟲ {flipped ? '正面' : '背面'}
      </button>
    </div>
  );
}
