import { beforeEach, describe, expect, it, vi } from 'vitest';

const execute = vi.fn();

vi.mock('@/server/db/client', () => ({
  getDb: () => ({ execute }),
}));

import { GET as getLive } from '@/app/api/health/live/route';
import { GET as getReady } from '@/app/api/health/ready/route';

beforeEach(() => {
  execute.mockReset();
});

describe('health routes', () => {
  it('reports a live process without touching the database', async () => {
    const response = getLive();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'live' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('reports ready only when the core schema exists', async () => {
    execute.mockResolvedValue({ rows: [{ goodsTable: 'goods' }] });

    const response = await getReady();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ready' });
  });

  it('returns 503 for an unavailable or unmigrated database', async () => {
    execute.mockResolvedValue({ rows: [{ goodsTable: null }] });

    const response = await getReady();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
