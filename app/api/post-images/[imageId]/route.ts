import { readFile } from 'node:fs/promises';

import { NextResponse } from 'next/server';

import { getAdminRoleForUser } from '@/lib/admin-access';
import { getAuthUser } from '@/server/auth/session';
import { communityImageAssetPath } from '@/server/community/image-store';
import { getPostImageAccess } from '@/server/data/post-images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const user = await getAuthUser();
  const access = await getPostImageAccess(
    (await params).imageId,
    user?.id,
    Boolean(user && getAdminRoleForUser(user)),
  );
  if (!access) return new NextResponse(null, { status: 404 });

  try {
    const bytes = await readFile(communityImageAssetPath(access.assetKey));
    return new Response(bytes, {
      headers: {
        'Cache-Control': access.isPublic
          ? 'public, max-age=86400, immutable'
          : 'private, no-store',
        'Content-Length': String(bytes.byteLength),
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
