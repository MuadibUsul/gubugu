import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/session', () => ({ getAuthUser: vi.fn() }));
vi.mock('@/server/data/user-scans', () => ({
  getOwnedUserScanAssetKey: vi.fn(),
}));
vi.mock('@/server/image-variants', () => ({ imageAssetResponse: vi.fn() }));
import { getAuthUser } from '@/server/auth/session';
import { getOwnedUserScanAssetKey } from '@/server/data/user-scans';
import { imageAssetResponse } from '@/server/image-variants';
import { GET } from './route';

const scanId = '12345678-1234-4234-8234-123456789abc';
const params = Promise.resolve({ scanId });
const request = new Request(
  `https://local.test/api/user-scans/${scanId}/image?side=back&w=320`,
  { headers: { 'If-None-Match': '"cached"' } },
);

beforeEach(() => vi.resetAllMocks());

it('never serves a cached response before authentication and ownership checks', async () => {
  vi.mocked(getAuthUser).mockResolvedValue(null);
  expect((await GET(request, { params })).status).toBe(401);
  expect(imageAssetResponse).not.toHaveBeenCalled();
  vi.mocked(getAuthUser).mockResolvedValue({ id: 'owner' } as NonNullable<
    Awaited<ReturnType<typeof getAuthUser>>
  >);
  vi.mocked(getOwnedUserScanAssetKey).mockResolvedValue(null);
  expect((await GET(request, { params })).status).toBe(404);
  expect(imageAssetResponse).not.toHaveBeenCalled();
  vi.mocked(getOwnedUserScanAssetKey).mockResolvedValue(
    `${'a'.repeat(64)}.webp`,
  );
  vi.mocked(imageAssetResponse).mockResolvedValue(
    new Response(null, { status: 304 }),
  );
  expect((await GET(request, { params })).status).toBe(304);
  expect(getOwnedUserScanAssetKey).toHaveBeenLastCalledWith({
    scanId,
    userId: 'owner',
    side: 'back',
  });
  expect(
    (await GET(request, { params: Promise.resolve({ scanId: '../bad' }) }))
      .status,
  ).toBe(404);
});
