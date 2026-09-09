'use client';

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';

import { frameForRarity } from '@/lib/collection-frame';

import styles from './holo-collectible.module.css';

/**
 * 全息卡交互边界（服务端渲染图与数据，这里只加一层可交互的箔面/高光/闪粉）。
 * 桌面用鼠标驱动 --px/--py；手机交给 CSS 自呼吸 + <HoloGyro> 的陀螺仪。
 */
export function HoloCollectible({
  children,
  rarityAverage,
}: {
  children: ReactNode;
  rarityAverage: number | null;
}) {
  const card = useRef<HTMLDivElement>(null);
  const pending = useRef<number | null>(null);
  const tier = frameForRarity(rarityAverage).tier;

  function reset() {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = null;
    const el = card.current;
    if (!el) return;
    el.style.removeProperty('--px');
    el.style.removeProperty('--py');
    el.removeAttribute('data-active');
  }

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change', reset);
    window.addEventListener('blur', reset);
    return () => {
      motion.removeEventListener('change', reset);
      window.removeEventListener('blur', reset);
      if (pending.current !== null) cancelAnimationFrame(pending.current);
    };
  }, []);

  function move(event: PointerEvent<HTMLDivElement>) {
    // 只在桌面鼠标下做指针跟随；触摸端由自呼吸 + 陀螺仪负责，避免抢滚动。
    if (
      event.pointerType !== 'mouse' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(() => {
      pending.current = null;
      const el = card.current;
      if (!el) return;
      el.dataset.active = 'true';
      el.style.setProperty('--px', String(x));
      el.style.setProperty('--py', String(y));
    });
  }

  return (
    <div
      className={styles.card}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
      ref={card}
    >
      <div className={styles.surface} data-tier={tier}>
        {children}
        <span aria-hidden="true" className={styles.shine} />
        <span aria-hidden="true" className={styles.sparkle} />
        <span aria-hidden="true" className={styles.glare} />
      </div>
    </div>
  );
}
