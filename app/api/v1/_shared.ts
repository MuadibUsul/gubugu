import { apiError } from '@/lib/api/envelope';
import { getAuthUser } from '@/server/auth/session';
import { ZodError } from 'zod';

export async function requireApiUser() {
  const user = await getAuthUser();
  return user ?? apiError(401, 'UNAUTHORIZED', '请先登录。');
}

export async function runApiRoute(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, 'INVALID_INPUT', '请求参数无效。');
    }
    console.error('[api/v1] request failed', error);
    return apiError(500, 'INTERNAL_ERROR', '服务暂时不可用。');
  }
}
