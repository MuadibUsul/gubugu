import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/server/auth/session', () => ({ getAuthUser: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ consumeServerWrite: vi.fn() }));
vi.mock('@/server/user-scans/save', () => ({
  saveCapturedScan: vi.fn(),
  saveScanBack: vi.fn(),
}));
import { getAuthUser } from '@/server/auth/session';
import { consumeServerWrite } from '@/lib/rate-limit';
import { saveCapturedScan, saveScanBack } from '@/server/user-scans/save';
import { POST } from './route';

const request = (form = new FormData()) =>
  new Request('http://localhost/api/user-scans', {
    method: 'POST',
    body: form,
  });
describe('private paired scan API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getAuthUser).mockResolvedValue({
      id: crypto.randomUUID(),
    } as NonNullable<Awaited<ReturnType<typeof getAuthUser>>>);
    vi.mocked(consumeServerWrite).mockReturnValue(true);
  });
  it('rejects unauthenticated requests without touching storage', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(saveCapturedScan).not.toHaveBeenCalled();
    expect(saveScanBack).not.toHaveBeenCalled();
  });
  it('rejects rate-limited requests before reading images', async () => {
    vi.mocked(consumeServerWrite).mockReturnValue(false);
    expect((await POST(request())).status).toBe(429);
    expect(saveCapturedScan).not.toHaveBeenCalled();
  });
  it('rejects path-like scan IDs and unsupported image types', async () => {
    const form = new FormData();
    form.set('scanId', '../someone-else');
    expect((await POST(request(form))).status).toBe(400);
    form.set('scanId', crypto.randomUUID());
    form.set(
      'back',
      new File(['<svg/>'], 'back.svg', { type: 'image/svg+xml' }),
    );
    expect((await POST(request(form))).status).toBe(415);
    expect(saveScanBack).not.toHaveBeenCalled();
  });
  it('uses the authenticated owner and does not reveal another account’s scan', async () => {
    vi.mocked(saveScanBack).mockResolvedValue(null);
    const form = new FormData();
    const scanId = crypto.randomUUID();
    form.set('scanId', scanId);
    form.set('userId', 'forged-owner');
    form.set('back', new File(['back'], 'back.jpg', { type: 'image/jpeg' }));
    expect((await POST(request(form))).status).toBe(404);
    const user = await getAuthUser();
    expect(saveScanBack).toHaveBeenCalledWith(
      user!.id,
      scanId,
      Buffer.from('back'),
    );
  });
});
