import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/server/auth/session', () => ({
  getAuthUser: vi.fn(async () => ({ id: 'user' })),
}));
vi.mock('@/lib/rate-limit', () => ({ consumeServerWrite: vi.fn(() => true) }));
vi.mock('@/server/recognition/service', () => ({
  recognizeGoodsImage: vi.fn(),
}));
vi.mock('@/server/recognition/confirm', () => ({
  confirmRecognitionAttempt: vi.fn(),
}));
vi.mock('@/server/user-scans/record', () => ({
  recordUnidentifiedScan: vi.fn(),
}));
import { recognizeGoodsImage } from '@/server/recognition/service';
import { confirmRecognitionAttempt } from '@/server/recognition/confirm';
import { recordUnidentifiedScan } from '@/server/user-scans/record';
import { POST } from './route';

describe('batch recognition preview', () => {
  beforeEach(() => vi.clearAllMocks());
  it('does not light or save even a high-confidence match before review', async () => {
    vi.mocked(recognizeGoodsImage).mockResolvedValue({
      requestId: crypto.randomUUID(),
      pipeline: { provider: 'embedding-search' },
      candidates: [
        { id: crypto.randomUUID(), score: 0.999, goods: { name: 'Card' } },
      ],
    } as Awaited<ReturnType<typeof recognizeGoodsImage>>);
    const body = new FormData();
    body.set(
      'image',
      new File(['fixture'], 'card.jpg', { type: 'image/jpeg' }),
    );
    body.set('previewOnly', 'true');
    body.set('saveUnidentified', 'true');
    const response = await POST(
      new Request('http://localhost/api/recognition/scan', {
        method: 'POST',
        headers: { 'user-agent': 'Android Mobile' },
        body,
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).candidates).toHaveLength(1);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(confirmRecognitionAttempt).not.toHaveBeenCalled();
    expect(recordUnidentifiedScan).not.toHaveBeenCalled();
  });
});
