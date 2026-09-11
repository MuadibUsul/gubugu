import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb } from '@/server/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getDb().execute<{ goodsTable: string | null }>(
      sql`select to_regclass('public.goods')::text as "goodsTable"`,
    );

    if (result.rows[0]?.goodsTable !== 'goods') {
      throw new Error('Core database schema is missing.');
    }

    return NextResponse.json(
      { status: 'ready' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error(
      '[health] readiness check failed:',
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
