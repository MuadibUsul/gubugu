import { readFile } from 'node:fs/promises';

import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { userScans } from '@/drizzle/schema';
import { getAuthUser } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { userScanAssetPath } from '@/server/user-scans/image-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scanIdSchema = z.uuid();

type UserScanImageRouteProps = {
  params: Promise<{ scanId: string }>;
};

export async function GET(
  _request: Request,
  { params }: UserScanImageRouteProps,
) {
  const user = await getAuthUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const parsedId = scanIdSchema.safeParse((await params).scanId);
  if (!parsedId.success) return new NextResponse(null, { status: 404 });

  const scan = (
    await getDb()
      .select({ assetKey: userScans.assetKey })
      .from(userScans)
      .where(
        and(eq(userScans.id, parsedId.data), eq(userScans.userId, user.id)),
      )
      .limit(1)
  )[0];
  if (!scan) return new NextResponse(null, { status: 404 });

  try {
    const bytes = await readFile(userScanAssetPath(scan.assetKey));

    return new Response(bytes, {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(bytes.byteLength),
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
