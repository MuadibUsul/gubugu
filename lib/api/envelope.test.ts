import { describe, expect, it } from 'vitest';

import { apiError, apiSuccess } from './envelope';

describe('api envelope', () => {
  it('returns a stable success envelope', async () => {
    const response = apiSuccess({ id: 'sku-1' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: 'sku-1' },
      error: null,
      meta: {},
    });
  });

  it('returns a safe error envelope without internal details', async () => {
    const response = apiError(401, 'UNAUTHORIZED', '请先登录。');
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: '请先登录。' },
      meta: {},
    });
  });
});
