'use client';

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';

import { frameForRarity } from '@/lib/collection-frame';

import styles from './holo-collectible.module.css';

/** A small interactive boundary; the artwork and data stay server-rendered. */
export function HoloCollectible({
  children,
  rarityAverage,
}: {
  children: ReactNode;
  rarityAverage: number | null;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const pending = useRef<number | null>(null);
  const tier = frameForRarity(rarityAverage).tier;

  function reset() {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = null;
    surface.current?.removeAttribute('style');
    surface.current?.removeAttribute('data-active');
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
    if (
      event.pointerType !== 'mouse' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;

    // Measure the stationary wrapper, so the tilt cannot feed back into itself.
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    );
    const y = Math.min(
      1,
      Math.max(0, (event.clientY - bounds.top) / bounds.height),
    );
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(() => {
      pending.current = null;
      const card = surface.current;
      if (!card) return;
      card.dataset.active = 'true';
      card.style.transform = `rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 12}deg)`;
      card.style.setProperty('--pointer-x', `${x * 100}%`);
      card.style.setProperty('--pointer-y', `${y * 100}%`);
      card.style.setProperty('--background-x', `${37 + x * 26}%`);
      card.style.setProperty('--background-y', `${33 + y * 34}%`);
    });
  }

  return (
    <div
      className={styles.card}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <div className={styles.surface} data-tier={tier} ref={surface}>
        {children}
        <span aria-hidden="true" className={styles.shine} />
        <span aria-hidden="true" className={styles.glare} />
      </div>
    </div>
  );
}
