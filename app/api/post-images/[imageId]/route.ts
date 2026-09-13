import { NextResponse } from 'next/server';

import { getAdminRoleForUser } from '@/lib/admin-access';
import { getAuthUser } from '@/server/auth/session';
import { communityImageAssetPath } from '@/server/community/image-store';
import { getPostImageAccess } from '@/server/data/post-images';
import { imageAssetResponse } from '@/server/image-variants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
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
    // Moderation/deletion can revoke public posts too: always revalidate access.
    return await imageAssetResponse(
      request,
      communityImageAssetPath(access.assetKey),
    );
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
