import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

describe('service worker privacy boundary', () => {
  it('clears the previous cache generation and never intercepts private APIs', async () => {
    const listeners = new Map<string, (event: never) => void>();
    const remove = vi.fn(async () => true);
    const source = await readFile('public/sw.js', 'utf8');
    vm.runInNewContext(source, {
      URL,
      caches: {
        delete: remove,
        keys: async () => ['gbg-v4-runtime', 'gbg-v5-static'],
      },
      self: {
        clients: { claim: async () => undefined },
        location: { origin: 'https://gubugu.test' },
        addEventListener: (name: string, listener: (event: never) => void) =>
          listeners.set(name, listener),
      },
    });

    let activation: Promise<unknown> | undefined;
    listeners.get('activate')?.({
      waitUntil: (promise: Promise<unknown>) => (activation = promise),
    } as never);
    await activation;
    expect(remove).toHaveBeenCalledWith('gbg-v4-runtime');

    const respondWith = vi.fn();
    listeners.get('fetch')?.({
      request: {
        method: 'GET',
        mode: 'cors',
        url: 'https://gubugu.test/api/v1/notifications',
      },
      respondWith,
    } as never);
    expect(respondWith).not.toHaveBeenCalled();
  });
});
