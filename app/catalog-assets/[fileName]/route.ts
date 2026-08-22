import { readFile } from 'node:fs/promises';

import { catalogAssetPath } from '@/server/catalog-crawler/image-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CatalogAssetRouteProps = {
  params: Promise<{ fileName: string }>;
};

export async function GET(
  _request: Request,
  { params }: CatalogAssetRouteProps,
) {
  const { fileName } = await params;

  try {
    const bytes = await readFile(
      catalogAssetPath(fileName, process.env.CATALOG_ASSET_DIR),
    );

    return new Response(bytes, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(bytes.byteLength),
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
