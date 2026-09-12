import { describe, expect, it } from 'vitest';
import { readScanForm, scanImageFile } from './upload';

describe('private scan uploads', () => {
  it('reads front and back from the same multipart request', async () => {
    const form = new FormData();
    form.set('front', new File(['front'], 'front.jpg', { type: 'image/jpeg' }));
    form.set('back', new File(['back'], 'back.png', { type: 'image/png' }));
    const parsed = await readScanForm(
      new Request('http://localhost/api/user-scans', {
        method: 'POST',
        body: form,
      }),
    );
    expect(await scanImageFile(parsed.get('front')).text()).toBe('front');
    expect(await scanImageFile(parsed.get('back')).text()).toBe('back');
  });
  it('rejects unsupported, absent, and oversized sides', () => {
    expect(() => scanImageFile(null)).toThrow('缺少图片');
    expect(() =>
      scanImageFile(
        new File(['<svg/>'], 'card.svg', { type: 'image/svg+xml' }),
      ),
    ).toThrow('仅支持');
    expect(() =>
      scanImageFile(
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'card.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).toThrow('10 MB');
  });
  it('enforces the body limit even without a content-length header', async () => {
    const request = new Request('http://localhost/api/user-scans', {
      method: 'POST',
      body: new Uint8Array(21 * 1024 * 1024),
    });
    expect(request.headers.has('content-length')).toBe(false);
    await expect(readScanForm(request)).rejects.toMatchObject({ status: 413 });
  });
});
