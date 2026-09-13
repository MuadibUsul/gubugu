'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './holo-card.module.css';

/**
 * 交互式全息卡。逻辑移植自 simeydotme/pokemon-cards-css 的 Card.svelte：
 * 拖动用 rAF 平滑倾斜；翻面由独立 CSS 3D 层连续旋转，静止即停帧。
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

type HoloCardProps = {
  src: string;
  alt: string;
  backSrc?: string | null;
  className?: string;
};

export function HoloCard(props: HoloCardProps) {
  return (
    <HoloCardSurface key={`${props.src}:${props.backSrc ?? ''}`} {...props} />
  );
}

function HoloCardSurface({ src, alt, backSrc, className }: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const backRef = useRef<HTMLImageElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const rotatorRef = useRef<HTMLDivElement>(null);
  const flippingRef = useRef(false);
  const resetTiltRef = useRef(() => {});
  const rafRef = useRef<number | null>(null);
  // 拖动过（超过阈值）就把这次的 click 当成"转卡"而非"翻面"，避免拖完手一松就翻面。
  const draggedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [backReady, setBackReady] = useState(!backSrc);
  const [backError, setBackError] = useState(false);
  const [instant, setInstant] = useState(false);
  const showingBack = flipped && backReady;

  useEffect(() => {
    const img = backRef.current;
    if (!img) return;
    let cancelled = false;
    const fail = () => {
      if (!cancelled) setBackError(true);
    };
    const ready = async () => {
      try {
        await img.decode();
        if (!cancelled) {
          setBackReady(true);
          setBackError(false);
        }
      } catch {
        fail();
      }
    };
    img.addEventListener('load', ready);
    img.addEventListener('error', fail);
    if (img.complete) {
      if (img.naturalWidth > 0) void ready();
      else fail();
    }
    return () => {
      cancelled = true;
      img.removeEventListener('load', ready);
      img.removeEventListener('error', fail);
    };
  }, [backSrc]);

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
    const el = rotatorRef.current;
    if (!el) return;

    const write = () => {
      const c = s.current;
      if (tiltRef.current)
        tiltRef.current.style.transform = `rotateY(${c.rx}deg) rotateX(${c.ry}deg)`;
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
      if (cardRef.current) cardRef.current.dataset.active = 'false';
      kick();
    };
    resetTiltRef.current = rest;

    // 手动「拖拽自由转动」：在卡面任意按住拖动，累积角度、范围大（远超此前跟手位置的小幅
    // 倾斜），像把实体卡拿在手里转。松手缓缓回正。拖动时陀螺仪让位、且这次不触发翻面。
    const MAXY = 45; // 左右转（rotateY）最大角
    const MAXX = 32; // 上下转（rotateX）最大角
    const SENS = 0.32; // 每像素多少度
    let dragging = false;
    let activePointer: number | null = null;
    let sx = 0;
    let sy = 0;
    let baseTrx = 0;
    let baseTry = 0;
    let moved = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0 || dragging || flippingRef.current)
        return;
      dragging = true;
      activePointer = e.pointerId;
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
      if (!dragging || e.pointerId !== activePointer) return;
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
      if (cardRef.current) cardRef.current.dataset.active = 'true';
      kick();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== activePointer) return;
      dragging = false;
      activePointer = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* 忽略 */
      }
      rest();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);

    write();

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      resetTiltRef.current = () => {};
    };
  }, []);

  const toggleFlip = (keyboard = false) => {
    if (!loaded) return;
    resetTiltRef.current();
    setInstant(keyboard);
    setFlipped((v) => !v);
  };

  return (
    <div
      className={`${styles.card} ${className ?? ''}`}
      data-active="false"
      data-instant={instant}
      data-flipped={showingBack ? 'true' : 'false'}
      data-loaded={loaded ? 'true' : 'false'}
      ref={cardRef}
    >
      <div className={styles.tilt} ref={tiltRef}>
        <div
          className={styles.rotator}
          ref={rotatorRef}
          onTransitionRun={(event) => {
            if (
              event.target === event.currentTarget &&
              event.propertyName === 'transform'
            )
              flippingRef.current = true;
          }}
          onTransitionEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.propertyName === 'transform'
            )
              flippingRef.current = false;
          }}
          onTransitionCancel={(event) => {
            if (
              event.target === event.currentTarget &&
              event.propertyName === 'transform'
            )
              flippingRef.current = false;
          }}
          role="button"
          tabIndex={0}
          aria-label={`${alt}，${showingBack ? '翻到正面' : '翻到背面'}`}
          aria-pressed={showingBack}
          aria-busy={flipped && !backReady && !backError}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleFlip(true);
            }
          }}
          onClick={(event) => {
            // 拖动转卡后松手不要误翻面；仅点按(未拖动)才翻面
            if (draggedRef.current) {
              draggedRef.current = false;
              return;
            }
            toggleFlip(event.detail === 0);
          }}
        >
          <div className={`${styles.face} ${styles.front}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={alt}
              className={styles.art}
              fetchPriority="high"
              decoding="async"
              draggable={false}
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
              <img
                alt={`${alt} 背面`}
                className={styles.backImg}
                src={backSrc}
                ref={backRef}
                decoding="async"
                fetchPriority="low"
                draggable={false}
              />
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
      </div>
      <button
        aria-label={
          flipped && !backReady
            ? '取消翻面'
            : showingBack
              ? '翻到正面'
              : '翻到背面'
        }
        className={styles.flipBtn}
        disabled={!loaded}
        onClick={(e) => {
          e.stopPropagation();
          toggleFlip(e.detail === 0);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        type="button"
      >
        ⟲{' '}
        {flipped && !backReady
          ? backError
            ? '取消翻面'
            : '加载背面…'
          : showingBack
            ? '正面'
            : '背面'}
      </button>
      {backError ? (
        <p role="alert">背面加载失败，请重新打开卡片后重试。</p>
      ) : null}
    </div>
  );
}
