import 'server-only';

import { headers } from 'next/headers';

import { isMobileUserAgent } from '@/lib/device';

/**
 * Whether the current request comes from a mobile device, read from the request
 * User-Agent. Used to gate the phone-only 点亮 (recognition) flow server-side so a
 * desktop request cannot reach `/recognition` or its API even by direct URL.
 */
export async function isMobileRequest(): Promise<boolean> {
  const headerList = await headers();

  return isMobileUserAgent(headerList.get('user-agent'));
}
