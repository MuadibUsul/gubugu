import { NextResponse } from 'next/server';

const privateResponse = { 'Cache-Control': 'private, no-store' };

export function apiSuccess<T>(data: T) {
  return NextResponse.json(
    { success: true, data, error: null, meta: {} },
    { headers: privateResponse },
  );
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message }, meta: {} },
    { status, headers: privateResponse },
  );
}
