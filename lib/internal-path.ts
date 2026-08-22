import { z } from 'zod';

export function isInternalPath(value: string) {
  return /^\/(?!\/)/.test(value) && !value.includes('\\');
}

export const internalPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine(isInternalPath, { message: '路径必须是站内路由。' });

export function normalizeInternalPath(
  value: string | null | undefined,
  fallback = '/',
) {
  return value && isInternalPath(value) ? value : fallback;
}
