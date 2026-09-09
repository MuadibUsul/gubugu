import type { ReactNode } from 'react';

import { frameForRarity } from '@/lib/collection-frame';

import styles from './holo-collectible.module.css';

/**
 * 谷柜墙缩略图上的静态全息薄层（箔面 + 高光，纯 CSS、无逐帧动画/无交互）——
 * 墙上卡多，任何逐帧重绘都会拖卡。可交互的全息(倾斜/拖动)在详情页的 HoloCard。
 */
export function HoloCollectible({
  children,
  rarityAverage,
}: {
  children: ReactNode;
  rarityAverage: number | null;
}) {
  const tier = frameForRarity(rarityAverage).tier;
  return (
    <div className={styles.card}>
      <div className={styles.surface} data-tier={tier}>
        {children}
        <span aria-hidden="true" className={styles.shine} />
        <span aria-hidden="true" className={styles.glare} />
      </div>
    </div>
  );
}
