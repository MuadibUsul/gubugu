import { catalogAssetPath } from '@/server/catalog-crawler/image-store';
import { imageAssetResponse } from '@/server/image-variants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CatalogAssetRouteProps = {
  params: Promise<{ fileName: string }>;
};

export async function GET(
  request: Request,
  { params }: CatalogAssetRouteProps,
) {
  const { fileName } = await params;

  try {
    return await imageAssetResponse(
      request,
      catalogAssetPath(fileName, process.env.CATALOG_ASSET_DIR),
      true,
    );
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
