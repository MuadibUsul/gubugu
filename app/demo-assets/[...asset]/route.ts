import { NextResponse } from 'next/server';

import { getDemoAssetSpec, type DemoAssetSize } from '@/lib/demo-assets';

type DemoAssetRouteContext = {
  params: Promise<{
    asset: string[];
  }>;
};

const sizeMap: Record<DemoAssetSize, { width: number; height: number }> = {
  landscape: { width: 1600, height: 960 },
  portrait: { width: 1200, height: 1500 },
  square: { width: 1200, height: 1200 },
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(value: string, maxCharsPerLine: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharsPerLine || currentLine.length === 0) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);

    if (lines.length === maxLines) {
      return lines;
    }

    currentLine = word;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (words.length === 0) {
    return ['图鉴资源'];
  }

  return lines.slice(0, maxLines);
}

function renderTextLines(
  lines: string[],
  startX: number,
  startY: number,
  lineHeight: number,
) {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${startX}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');
}

function renderChips(chips: string[], startX: number, topY: number) {
  return chips
    .map((chip, index) => {
      const x = startX + index * 188;

      return `
        <rect x="${x}" y="${topY}" width="168" height="44" rx="22" fill="rgba(255,255,255,0.7)" stroke="rgba(255,255,255,0.75)" />
        <text x="${x + 84}" y="${topY + 28}" text-anchor="middle" font-size="18" fill="rgba(49,34,26,0.72)" font-family="'Aptos', 'Segoe UI', sans-serif" letter-spacing="2">${escapeXml(chip.toUpperCase())}</text>
      `;
    })
    .join('');
}

function buildSvg(assetPath: string) {
  const spec = getDemoAssetSpec(assetPath);
  const { width, height } = sizeMap[spec.size];
  const titleLines = wrapText(
    spec.title,
    spec.size === 'landscape' ? 18 : 13,
    spec.size === 'landscape' ? 2 : 3,
  );
  const subtitleLines = wrapText(
    spec.subtitle,
    spec.size === 'landscape' ? 34 : 22,
    3,
  );
  const titleStartX = 120;
  const titleStartY = spec.size === 'landscape' ? 288 : 368;
  const titleLineHeight = spec.size === 'landscape' ? 84 : 92;
  const subtitleStartY = titleStartY + titleLines.length * titleLineHeight + 42;
  const panelWidth = width - 160;
  const panelHeight = Math.round(
    height * (spec.size === 'landscape' ? 0.52 : 0.62),
  );
  const panelY = height - panelHeight - 84;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(spec.title)}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
        <stop stop-color="${spec.palette.backgroundStart}" />
        <stop offset="1" stop-color="${spec.palette.backgroundEnd}" />
      </linearGradient>
      <radialGradient id="orb" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${width - 200} ${height * 0.22}) rotate(90) scale(${height * 0.3} ${width * 0.26})">
        <stop stop-color="${spec.palette.accent}" stop-opacity="0.28" />
        <stop offset="1" stop-color="${spec.palette.accent}" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="panel" x1="80" y1="${panelY}" x2="${width - 80}" y2="${height - 80}" gradientUnits="userSpaceOnUse">
        <stop stop-color="${spec.palette.panel}" stop-opacity="0.96" />
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.78" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" rx="64" fill="url(#bg)" />
    <rect x="38" y="38" width="${width - 76}" height="${height - 76}" rx="42" stroke="rgba(166,125,101,0.22)" />
    <rect x="72" y="72" width="${width - 144}" height="2" rx="1" fill="rgba(255,255,255,0.86)" />
    <circle cx="${width - 150}" cy="${Math.round(height * 0.22)}" r="${Math.round(height * 0.18)}" fill="url(#orb)" />
    <circle cx="${Math.round(width * 0.16)}" cy="${Math.round(height * 0.78)}" r="${Math.round(height * 0.12)}" fill="rgba(255,255,255,0.34)" />
    <rect x="80" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="44" fill="url(#panel)" stroke="rgba(166,125,101,0.18)" />
    <rect x="${width - 420}" y="${panelY + 54}" width="250" height="250" rx="44" fill="rgba(255,255,255,0.64)" stroke="rgba(166,125,101,0.14)" />
    <rect x="${width - 384}" y="${panelY + 90}" width="178" height="178" rx="89" fill="rgba(255,255,255,0.88)" stroke="rgba(166,125,101,0.18)" />
    <rect x="${width - 500}" y="${panelY + 150}" width="144" height="12" rx="6" fill="${spec.palette.accent}" fill-opacity="0.2" />
    <rect x="${width - 500}" y="${panelY + 186}" width="214" height="12" rx="6" fill="${spec.palette.accent}" fill-opacity="0.16" />
    <rect x="${width - 500}" y="${panelY + 222}" width="172" height="12" rx="6" fill="${spec.palette.accent}" fill-opacity="0.12" />
    <text x="120" y="140" fill="${spec.palette.muted}" font-size="24" font-family="'Aptos', 'Segoe UI', sans-serif" letter-spacing="8">${escapeXml(spec.eyebrow.toUpperCase())}</text>
    <text x="${titleStartX}" y="${titleStartY}" fill="${spec.palette.text}" font-size="${spec.size === 'landscape' ? 76 : 82}" font-family="'Iowan Old Style', Georgia, serif" font-weight="600">${renderTextLines(titleLines, titleStartX, titleStartY, titleLineHeight)}</text>
    <text x="${titleStartX}" y="${subtitleStartY}" fill="${spec.palette.muted}" font-size="${spec.size === 'landscape' ? 28 : 30}" font-family="'Aptos', 'Segoe UI', sans-serif" font-weight="500">${renderTextLines(subtitleLines, titleStartX, subtitleStartY, 42)}</text>
    ${renderChips(spec.chips, 120, panelY + panelHeight - 108)}
  </svg>`;
}

export async function GET(_: Request, context: DemoAssetRouteContext) {
  const { asset } = await context.params;
  const assetPath = asset.join('/');
  const svg = buildSvg(assetPath);

  return new NextResponse(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
