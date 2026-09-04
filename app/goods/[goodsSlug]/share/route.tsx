import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { z } from 'zod';

import { formatGoodsTypeLabel } from '@/lib/catalog-labels';
import { toSafeShareImageUrl } from '@/lib/goods-image';
import { catalogAssetPath } from '@/server/catalog-crawler/image-store';
import { getGoodsDetailPageData } from '@/server/data';

// ImageResponse (Satori) 只认 PNG/JPEG，不支持 WebP —— 而爬取入库的目录图都是
// .webp。这里统一用 sharp 把主图转成 PNG data URI 再喂给卡片：本地 catalog-assets
// 直接读盘，其余走 SSRF 白名单后 fetch。转换失败则回退到占位版式。
async function loadShareImagePng(
  rawUrl: string | null | undefined,
): Promise<string | null> {
  if (!rawUrl) return null;

  try {
    let bytes: Buffer | null = null;

    const localMatch = rawUrl.match(/\/catalog-assets\/([^/?#]+)$/);
    if (localMatch) {
      bytes = await readFile(catalogAssetPath(decodeURIComponent(localMatch[1])));
    } else {
      const safeUrl = toSafeShareImageUrl(rawUrl);
      if (!safeUrl) return null;
      const res = await fetch(safeUrl);
      if (!res.ok) return null;
      bytes = Buffer.from(await res.arrayBuffer());
    }

    const png = await sharp(bytes)
      .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 300;

const paramsSchema = z.object({
  goodsSlug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

const cardSize = {
  width: 1080,
  height: 1440,
} as const;

const shareCardFont = readFile(
  join(process.cwd(), 'public/fonts/SmileySans-Oblique.otf'),
).then(
  (font) =>
    font.buffer.slice(
      font.byteOffset,
      font.byteOffset + font.byteLength,
    ) as ArrayBuffer,
);

function getTitleSize(title: string) {
  if (title.length > 48) return 44;
  if (title.length > 32) return 50;
  return 58;
}

const frameCorners = [
  { key: 'top-left', left: '31px', top: '31px', transform: 'rotate(0deg)' },
  { key: 'top-right', right: '31px', top: '31px', transform: 'rotate(90deg)' },
  {
    bottom: '31px',
    key: 'bottom-right',
    right: '31px',
    transform: 'rotate(180deg)',
  },
  {
    bottom: '31px',
    key: 'bottom-left',
    left: '31px',
    transform: 'rotate(270deg)',
  },
] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ goodsSlug: string }> },
) {
  const parsed = paramsSchema.safeParse(await context.params);

  if (!parsed.success) {
    return new Response('Invalid SKU', { status: 400 });
  }

  const goods = await getGoodsDetailPageData({
    goodsSlug: parsed.data.goodsSlug,
  });

  if (!goods) {
    return new Response('SKU not found', { status: 404 });
  }

  const primaryImage =
    goods.images.find((image) => image.isPrimary) ?? goods.images[0];
  // 主图转 PNG data URI（见 loadShareImagePng）：Satori 不支持 WebP，直接喂原图会让
  // 整张分享卡渲染失败、请求挂起。转换内部已复用 SSRF 白名单。
  const imageUrl = await loadShareImagePng(primaryImage?.imageUrl);
  const primaryCharacter =
    goods.characters.find((character) => character.isPrimary) ??
    goods.characters[0];
  const ratingLabel = goods.summary.ratingAverage
    ? `评分 ${goods.summary.ratingAverage.toFixed(1)} · ${goods.summary.ratingCount} 人评分`
    : '标准 SKU 收藏图鉴';
  const fontData = await shareCardFont;

  return new ImageResponse(
    <div
      style={{
        background:
          'radial-gradient(circle at 88% 7%, rgba(219, 198, 255, .82), transparent 25%), radial-gradient(circle at 8% 38%, rgba(255, 207, 225, .7), transparent 31%), linear-gradient(145deg, #fffdf9 0%, #f8f1ff 54%, #fff6f1 100%)',
        color: '#302438',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Smiley Sans',
        height: '100%',
        overflow: 'hidden',
        padding: '60px',
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        style={{
          border: '4px solid rgba(202, 157, 91, .46)',
          borderRadius: '58px',
          bottom: '22px',
          display: 'flex',
          left: '22px',
          position: 'absolute',
          right: '22px',
          top: '22px',
        }}
      />
      <div
        style={{
          border: '2px solid rgba(126, 91, 159, .2)',
          borderRadius: '48px',
          bottom: '34px',
          display: 'flex',
          left: '34px',
          position: 'absolute',
          right: '34px',
          top: '34px',
        }}
      />

      {frameCorners.map(({ key, ...cornerStyle }) => (
        <div
          key={key}
          style={{
            borderLeft: '2px solid rgba(191,136,71,.72)',
            borderRadius: '20px 0 0 0',
            borderTop: '2px solid rgba(191,136,71,.72)',
            display: 'flex',
            height: '64px',
            opacity: 0.78,
            position: 'absolute',
            width: '64px',
            ...cornerStyle,
          }}
        >
          <div
            style={{
              background: '#d29b4f',
              border: '3px solid #fff8ed',
              display: 'flex',
              height: '12px',
              left: '-5px',
              position: 'absolute',
              top: '-5px',
              transform: 'rotate(45deg)',
              width: '12px',
            }}
          />
        </div>
      ))}

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0 12px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div style={{ alignItems: 'center', display: 'flex', gap: '16px' }}>
          <div
            style={{
              alignItems: 'center',
              background: 'linear-gradient(145deg, #e34e77, #7a5ac8)',
              border: '4px solid rgba(255,255,255,.9)',
              borderRadius: '24px',
              boxShadow: '0 12px 30px rgba(96, 58, 118, .22)',
              color: 'white',
              display: 'flex',
              fontSize: '34px',
              fontWeight: 800,
              height: '68px',
              justifyContent: 'center',
              width: '68px',
            }}
          >
            谷
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '29px', fontWeight: 800 }}>谷布谷图鉴</div>
            <div
              style={{
                color: '#826f8c',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '4px',
              }}
            >
              GUBUGU ARCHIVE
            </div>
          </div>
        </div>

        <div
          style={{
            alignItems: 'center',
            background: 'rgba(255,255,255,.78)',
            border: '2px solid rgba(201, 157, 184, .4)',
            borderRadius: '999px',
            color: '#bd3d66',
            display: 'flex',
            fontSize: '18px',
            fontWeight: 800,
            gap: '10px',
            padding: '12px 20px',
          }}
        >
          <div
            style={{
              background: '#d39a4b',
              borderRadius: '999px',
              display: 'flex',
              height: '9px',
              width: '9px',
            }}
          />
          谷子分享卡
        </div>
      </div>

      <div
        style={{
          background:
            'linear-gradient(135deg, #e0b765 0%, #a884c7 31%, #e8a7bd 67%, #d7a84f 100%)',
          border: '4px solid rgba(255,255,255,.88)',
          borderRadius: '48px',
          boxShadow:
            '0 20px 42px rgba(76, 47, 94, .17), 0 0 0 3px rgba(190,139,79,.28)',
          display: 'flex',
          height: '810px',
          marginTop: '30px',
          overflow: 'hidden',
          padding: '9px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background:
              'radial-gradient(circle at 50% 15%, rgba(255,255,255,.95), transparent 42%), linear-gradient(150deg, #f5efff, #fff0f5)',
            border: '18px solid rgba(255,251,247,.96)',
            borderRadius: '38px',
            boxShadow: 'inset 0 0 0 2px rgba(168,123,177,.28)',
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
          }}
        >
          {imageUrl ? (
            // ImageResponse requires a native img element.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              src={imageUrl}
              style={{
                height: '100%',
                objectFit: 'contain',
                width: '100%',
              }}
            />
          ) : (
            <div
              style={{
                alignItems: 'center',
                color: '#b28da7',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: '180px', fontWeight: 800 }}>谷</div>
              <div style={{ fontSize: '26px', fontWeight: 700 }}>
                图片待补充
              </div>
            </div>
          )}

          <div
            style={{
              alignItems: 'center',
              background: '#d69f45',
              border: '5px solid rgba(255,255,255,.92)',
              borderRadius: '999px',
              bottom: '18px',
              boxShadow: '0 10px 24px rgba(92, 59, 31, .2)',
              color: '#fffaf2',
              display: 'flex',
              fontSize: '22px',
              fontWeight: 800,
              height: '72px',
              justifyContent: 'center',
              position: 'absolute',
              right: '18px',
              transform: 'rotate(-7deg)',
              width: '72px',
            }}
          >
            图鉴
          </div>
        </div>
      </div>

      <div
        style={{
          alignItems: 'center',
          color: '#b33d65',
          display: 'flex',
          fontSize: '22px',
          fontWeight: 800,
          gap: '14px',
          letterSpacing: '1px',
          marginTop: '26px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(90deg, #d3a052, #cb7b9a)',
            display: 'flex',
            height: '2px',
            width: '54px',
          }}
        />
        <div style={{ display: 'flex' }}>
          {goods.ip.name} · {goods.series.name}
        </div>
        <div
          style={{
            background:
              'linear-gradient(90deg, rgba(203,123,154,.7), rgba(203,123,154,0))',
            display: 'flex',
            flex: 1,
            height: '2px',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: `${getTitleSize(goods.name)}px`,
          fontWeight: 850,
          lineHeight: 1.12,
          marginTop: '13px',
          maxHeight: '132px',
          overflow: 'hidden',
          padding: '0 10px',
          position: 'relative',
          width: '100%',
        }}
      >
        {goods.name}
      </div>

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: '12px',
          marginTop: '18px',
          padding: '0 10px',
          position: 'relative',
          width: '100%',
        }}
      >
        {[
          formatGoodsTypeLabel(goods.goodsType),
          goods.edition,
          primaryCharacter?.name,
        ]
          .filter((label): label is string => Boolean(label))
          .slice(0, 3)
          .map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,.74)',
                border: '2px solid rgba(191, 169, 202, .45)',
                borderRadius: '999px',
                color: '#624f6c',
                display: 'flex',
                fontSize: '18px',
                fontWeight: 700,
                maxWidth: '300px',
                overflow: 'hidden',
                padding: '10px 17px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
          ))}
      </div>

      <div
        style={{
          alignItems: 'flex-end',
          borderTop: '2px solid rgba(165, 137, 177, .28)',
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'auto',
          padding: '22px 10px 0',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background: '#d0a052',
            border: '3px solid #fff8f1',
            display: 'flex',
            height: '14px',
            left: '50%',
            position: 'absolute',
            top: '-8px',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '14px',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#5e4a69', fontSize: '22px', fontWeight: 800 }}>
            {ratingLabel}
          </div>
          <div style={{ color: '#927f9a', fontSize: '18px', marginTop: '6px' }}>
            {goods.skuCode}
          </div>
        </div>
        <div
          style={{
            color: '#b43c65',
            display: 'flex',
            fontSize: '21px',
            fontWeight: 800,
          }}
        >
          收进谷柜 · 扫描点亮 · 找同好换谷
        </div>
      </div>
    </div>,
    {
      ...cardSize,
      fonts: [
        {
          data: fontData,
          name: 'Smiley Sans',
          style: 'normal',
          weight: 400,
        },
        {
          data: fontData,
          name: 'Smiley Sans',
          style: 'normal',
          weight: 700,
        },
      ],
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      },
    },
  );
}
