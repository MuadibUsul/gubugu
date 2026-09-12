import { readFile } from 'node:fs/promises';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthUser } from '@/server/auth/session';
import { getOwnedUserScanAssetKey } from '@/server/data/user-scans';
import { userScanAssetPath } from '@/server/user-scans/image-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scanIdSchema = z.uuid();

type UserScanImageRouteProps = {
  params: Promise<{ scanId: string }>;
};

export async function GET(
  request: Request,
  { params }: UserScanImageRouteProps,
) {
  const user = await getAuthUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const parsedId = scanIdSchema.safeParse((await params).scanId);
  if (!parsedId.success) return new NextResponse(null, { status: 404 });
  const side = z
    .enum(['front', 'back'])
    .safeParse(new URL(request.url).searchParams.get('side') ?? 'front');
  if (!side.success) return new NextResponse(null, { status: 404 });

  // 不存在与不属于本人都走这里：一律 404，不透露资源是否存在。
  const assetKey = await getOwnedUserScanAssetKey({
    scanId: parsedId.data,
    userId: user.id,
    side: side.data,
  });
  if (!assetKey) return new NextResponse(null, { status: 404 });

  try {
    const bytes = await readFile(userScanAssetPath(assetKey));

    return new Response(bytes, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Length': String(bytes.byteLength),
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
