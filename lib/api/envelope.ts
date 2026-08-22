import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T) {
  return NextResponse.json({ success: true, data, error: null, meta: {} });
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message }, meta: {} },
    { status },
  );
}
