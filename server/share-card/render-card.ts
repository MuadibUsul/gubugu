import 'server-only';

import sharp from 'sharp';

/**
 * 分享卡渲染：用 sharp（内置 librsvg + Pango）直接拼图，不走 Satori/resvg。
 *
 * 换掉 next/og 的原因是实测数据：在部署机上整卡渲染约 11.8 秒，其中 sharp 相关的
 * 工作（抓图、栅格化、合成）只占约 110 毫秒，其余全耗在 Satori 排版 + resvg 栅格化。
 * 改成「手写 SVG 交给 librsvg + 主图另行合成」后同样的卡约 195 毫秒，快约 60 倍，
 * 输出体积也从 449KB 降到 242KB。
 *
 * 代价是版式不再由 CSS 自动完成：文字换行、胶囊宽度都要自己算（见下面的
 * measureText / wrapTitle）。所以布局常量集中放在这里，改设计时只动这一处。
 */

const FONT = 'Smiley Sans';
const WIDTH = 1080;
const HEIGHT = 1440;

// 主图画框：外框位置与内边距，主图按 fit=inside 缩放后居中合成进去。
const FRAME = { x: 63, y: 236, height: 810, inset: 9 + 18 };
const PHOTO_BOX = {
  width: WIDTH - FRAME.x * 2 - FRAME.inset * 2,
  height: FRAME.height - FRAME.inset * 2,
};

const TITLE = { x: 70, top: 1112, maxWidth: WIDTH - 140, maxLines: 2 };
const PILLS = { x: 70, y: 1215, height: 42, gap: 12, padding: 34, fontSize: 18 };

export type ShareCardInput = {
  /** 主图原始字节（任意 sharp 能解码的格式）。为空时用占位版式。 */
  photo: Buffer | null;
  title: string;
  /** IP · 系列 */
  seriesLine: string;
  tags: string[];
  ratingLabel: string;
  skuCode: string;
};

function esc(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char] as string,
  );
}

/**
 * 用 sharp 的 text 输入量一段文字的真实宽高。Pango 的排版结果和 librsvg 渲染
 * 同一字体时一致，所以可以据此撑开胶囊背景、决定标题在哪里断行。约 5ms 一次。
 */
async function measureText(text: string, size: number) {
  if (!text) return { width: 0, height: 0 };

  const { info } = await sharp({
    text: {
      text: `<span font="${FONT} ${size}px">${esc(text)}</span>`,
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });

  return { width: info.width, height: info.height };
}

/** 标题越长字号越小，与原卡面一致。 */
function titleFontSize(title: string) {
  if (title.length > 48) return 44;
  if (title.length > 32) return 50;
  return 58;
}

export type TextMeasurer = (
  text: string,
  size: number,
) => Promise<{ width: number; height: number }>;

/**
 * 把标题折成至多 maxLines 行。SVG 的 <text> 不会自动换行，而谷子名里中英混排、
 * 中文没有空格，所以按字符做二分找最长可容纳前缀，超出的行尾用省略号收口。
 *
 * 量测函数可注入：真实渲染走 Pango，测试里换成确定性的假量测，这样折行边界的
 * 验证不依赖运行环境里装没装字体。
 */
export async function wrapTitle(
  title: string,
  size: number,
  measure: TextMeasurer = measureText,
) {
  const lines: string[] = [];
  let rest = title;

  for (let line = 0; line < TITLE.maxLines && rest.length > 0; line += 1) {
    const { width } = await measure(rest, size);

    if (width <= TITLE.maxWidth) {
      lines.push(rest);
      rest = '';
      break;
    }

    // 二分出能放下的最长前缀。最多 ~7 次量测，约 35ms。
    let low = 1;
    let high = rest.length;
    let fit = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = rest.slice(0, mid);
      const measured = await measure(candidate, size);

      if (measured.width <= TITLE.maxWidth) {
        fit = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const isLastLine = line === TITLE.maxLines - 1;
    const consumed = rest.slice(0, fit);

    if (isLastLine && fit < rest.length) {
      lines.push(`${consumed.slice(0, Math.max(1, fit - 1))}…`);
      rest = '';
    } else {
      lines.push(consumed);
      rest = rest.slice(fit);
    }
  }

  return lines;
}

function cornerOrnament(x: number, y: number, rotation: number) {
  return `<g transform="translate(${x} ${y}) rotate(${rotation})">
    <path d="M0 64 L0 20 Q0 0 20 0 L64 0" fill="none" stroke="rgba(191,136,71,.72)" stroke-width="2" opacity=".78"/>
    <rect x="-6" y="-6" width="12" height="12" fill="#d29b4f" stroke="#fff8ed" stroke-width="3" transform="rotate(45)"/>
  </g>`;
}

export async function renderShareCard(input: ShareCardInput): Promise<Buffer> {
  const size = titleFontSize(input.title);

  // 主图与文字量测互不依赖，一起并发。
  const [photo, titleLines, pillWidths] = await Promise.all([
    input.photo
      ? sharp(input.photo)
          .resize({
            width: PHOTO_BOX.width,
            height: PHOTO_BOX.height,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .png()
          .toBuffer({ resolveWithObject: true })
          .catch(() => null)
      : Promise.resolve(null),
    wrapTitle(input.title, size),
    Promise.all(
      input.tags
        .slice(0, 3)
        .map(async (label) => (await measureText(label, PILLS.fontSize)).width),
    ),
  ]);

  let pillX = PILLS.x;
  const pills = input.tags.slice(0, 3).map((label, index) => {
    const width = pillWidths[index] + PILLS.padding;
    const placed = { label, x: pillX, width };
    pillX += width + PILLS.gap;
    return placed;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffdf9"/><stop offset=".54" stop-color="#f8f1ff"/><stop offset="1" stop-color="#fff6f1"/>
    </linearGradient>
    <radialGradient id="glowA" cx=".88" cy=".07" r=".25">
      <stop offset="0" stop-color="rgba(219,198,255,.82)"/><stop offset="1" stop-color="rgba(219,198,255,0)"/>
    </radialGradient>
    <radialGradient id="glowB" cx=".08" cy=".38" r=".31">
      <stop offset="0" stop-color="rgba(255,207,225,.7)"/><stop offset="1" stop-color="rgba(255,207,225,0)"/>
    </radialGradient>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e0b765"/><stop offset=".31" stop-color="#a884c7"/>
      <stop offset=".67" stop-color="#e8a7bd"/><stop offset="1" stop-color="#d7a84f"/>
    </linearGradient>
    <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e34e77"/><stop offset="1" stop-color="#7a5ac8"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d3a052"/><stop offset="1" stop-color="#cb7b9a"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowA)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowB)"/>

  <rect x="22" y="22" width="${WIDTH - 44}" height="${HEIGHT - 44}" rx="58" fill="none" stroke="rgba(202,157,91,.46)" stroke-width="4"/>
  <rect x="34" y="34" width="${WIDTH - 68}" height="${HEIGHT - 68}" rx="48" fill="none" stroke="rgba(126,91,159,.2)" stroke-width="2"/>
  ${cornerOrnament(31, 31, 0)}${cornerOrnament(WIDTH - 31, 31, 90)}${cornerOrnament(WIDTH - 31, HEIGHT - 31, 180)}${cornerOrnament(31, HEIGHT - 31, 270)}

  <rect x="72" y="60" width="68" height="68" rx="24" fill="url(#logo)" stroke="rgba(255,255,255,.9)" stroke-width="4"/>
  <text x="106" y="105" font-family="${FONT}" font-size="34" fill="#fff" text-anchor="middle">谷</text>
  <text x="156" y="88" font-family="${FONT}" font-size="29" fill="#302438">谷布谷图鉴</text>
  <text x="156" y="112" font-family="${FONT}" font-size="16" fill="#826f8c" letter-spacing="4">GUBUGU ARCHIVE</text>
  <rect x="${WIDTH - 240}" y="72" width="168" height="46" rx="23" fill="rgba(255,255,255,.78)" stroke="rgba(201,157,184,.4)" stroke-width="2"/>
  <circle cx="${WIDTH - 214}" cy="95" r="5" fill="#d39a4b"/>
  <text x="${WIDTH - 198}" y="102" font-family="${FONT}" font-size="18" fill="#bd3d66">谷子分享卡</text>

  <rect x="${FRAME.x}" y="${FRAME.y}" width="${WIDTH - FRAME.x * 2}" height="${FRAME.height}" rx="48" fill="url(#frame)" stroke="rgba(255,255,255,.88)" stroke-width="4"/>
  <rect x="${FRAME.x + 9}" y="${FRAME.y + 9}" width="${WIDTH - FRAME.x * 2 - 18}" height="${FRAME.height - 18}" rx="38" fill="#f7f0ff" stroke="rgba(255,251,247,.96)" stroke-width="18"/>
  ${
    photo
      ? ''
      : `<text x="${WIDTH / 2}" y="${FRAME.y + 430}" font-family="${FONT}" font-size="180" fill="#b28da7" text-anchor="middle">谷</text>
         <text x="${WIDTH / 2}" y="${FRAME.y + 500}" font-family="${FONT}" font-size="26" fill="#b28da7" text-anchor="middle">图片待补充</text>`
  }
  <circle cx="${WIDTH - FRAME.x - 62}" cy="${FRAME.y + FRAME.height - 62}" r="36" fill="#d69f45" stroke="rgba(255,255,255,.92)" stroke-width="5"/>
  <text x="${WIDTH - FRAME.x - 62}" y="${FRAME.y + FRAME.height - 54}" font-family="${FONT}" font-size="22" fill="#fffaf2" text-anchor="middle">图鉴</text>

  <rect x="70" y="1090" width="54" height="2" fill="url(#rule)"/>
  <text x="138" y="1098" font-family="${FONT}" font-size="22" fill="#b33d65">${esc(input.seriesLine)}</text>

  ${titleLines
    .map(
      (line, index) =>
        `<text x="${TITLE.x}" y="${TITLE.top + size + index * (size * 1.12)}" font-family="${FONT}" font-size="${size}" fill="#302438">${esc(line)}</text>`,
    )
    .join('')}

  ${pills
    .map(
      (pill) =>
        `<rect x="${pill.x}" y="${PILLS.y}" width="${pill.width}" height="${PILLS.height}" rx="21" fill="rgba(255,255,255,.74)" stroke="rgba(191,169,202,.45)" stroke-width="2"/>
         <text x="${pill.x + pill.width / 2}" y="${PILLS.y + 28}" font-family="${FONT}" font-size="${PILLS.fontSize}" fill="#624f6c" text-anchor="middle">${esc(pill.label)}</text>`,
    )
    .join('')}

  <rect x="70" y="1320" width="${WIDTH - 140}" height="2" fill="rgba(165,137,177,.28)"/>
  <rect x="${WIDTH / 2 - 7}" y="1314" width="14" height="14" fill="#d0a052" stroke="#fff8f1" stroke-width="3" transform="rotate(45 ${WIDTH / 2} 1321)"/>
  <text x="70" y="1362" font-family="${FONT}" font-size="22" fill="#5e4a69">${esc(input.ratingLabel)}</text>
  <text x="70" y="1390" font-family="${FONT}" font-size="18" fill="#927f9a">${esc(input.skuCode)}</text>
  <text x="${WIDTH - 70}" y="1362" font-family="${FONT}" font-size="21" fill="#b43c65" text-anchor="end">收进谷柜 · 扫描点亮 · 找同好换谷</text>
</svg>`;

  const base = sharp(Buffer.from(svg));

  if (!photo) {
    return base.png().toBuffer();
  }

  return base
    .composite([
      {
        input: photo.data,
        left: Math.round(
          FRAME.x + FRAME.inset + (PHOTO_BOX.width - photo.info.width) / 2,
        ),
        top: Math.round(
          FRAME.y + FRAME.inset + (PHOTO_BOX.height - photo.info.height) / 2,
        ),
      },
    ])
    .png()
    .toBuffer();
}
