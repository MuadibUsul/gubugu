import Image from 'next/image';
import type { CSSProperties } from 'react';

import { HoloCollectible } from '@/components/collection/holo-collectible';
import { RemoteImage } from '@/components/ui/remote-image';
import { frameForRarity } from '@/lib/collection-frame';

type FramedCollectibleProps = {
  imageUrl: string | null;
  alt: string;
  /** 社区平均稀有度评分（1-5）；决定相框档位。 */
  rarityAverage: number | null;
  sizes: string;
  priority?: boolean;
};

// 固定的静态玻璃反光：一道斜向反光 + 顶部斜光晕。screen 混合让白光「加」到画面上（像真玻璃
// 反光而非糊白）。作为底层玻璃质感，外层 HoloCollectible 负责跟随反光。
const glassStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  pointerEvents: 'none',
  mixBlendMode: 'screen',
  background:
    'linear-gradient(122deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.09) 42%, rgba(255,255,255,.19) 48%, rgba(255,255,255,.05) 55%, rgba(255,255,255,0) 66%), linear-gradient(140deg, rgba(255,255,255,.11) 0%, rgba(255,255,255,0) 34%)',
};

const edgeStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 3,
  pointerEvents: 'none',
  borderRadius: 4,
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,.32), inset 0 0 0 1px rgba(255,255,255,.06)',
};

/**
 * 藏品相框：藏品用卡纸装裱在相框开口内（contain，横图/方图完整装入、不裁不漏），叠一层
 * 玻璃与镭射反光，外圈是按稀有度选定的相框。相框尺寸统一 3:4，外层容器控制大小，不同长宽比
 * 的藏品看起来大小相当。
 */
export function FramedCollectible({
  imageUrl,
  alt,
  rarityAverage,
  sizes,
  priority = false,
}: FramedCollectibleProps) {
  const frame = frameForRarity(rarityAverage);
  const { top, right, bottom, left } = frame.mat;

  return (
    <HoloCollectible rarityAverage={rarityAverage}>
      <div
        style={{ position: 'relative', aspectRatio: '3 / 4' }}
        data-frame-tier={frame.tier}
      >
        {/* 卡纸窗口 */}
        <div
          style={{
            position: 'absolute',
            top: `${top}%`,
            right: `${right}%`,
            bottom: `${bottom}%`,
            left: `${left}%`,
            background: '#f5eede',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow:
              'inset 0 0 0 1px rgba(60,45,25,.10), inset 0 3px 10px rgba(60,45,25,.10)',
          }}
        >
          {/* 藏品（contain，四周留卡纸） */}
          <div style={{ position: 'absolute', inset: '5%' }}>
            {imageUrl ? (
              <RemoteImage
                alt={alt}
                priority={priority}
                sizes={sizes}
                src={imageUrl}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : null}
          </div>
          <div style={glassStyle} />
          <div style={edgeStyle} />
        </div>

        {/* 相框描边压在开口边缘之上 */}
        <Image
          alt=""
          aria-hidden
          fill
          src={frame.src}
          sizes={sizes}
          style={{ objectFit: 'fill', zIndex: 4, pointerEvents: 'none' }}
        />
      </div>
    </HoloCollectible>
  );
}
