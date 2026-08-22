// The 点亮 (recognition) flow scans a real, physical 谷子 with a phone camera, so
// it is a phone-only activity. We detect mobile from the User-Agent to gate the
// route server-side: a desktop request must not even reach it by direct URL.
//
// This is a product restriction, not a security boundary — UA strings can be
// spoofed. The invariant that only a real camera + embedding attempt can light a
// collection still lives in the recognition service, not here.
const MOBILE_UA_PATTERN =
  /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i;

export function isMobileUserAgent(
  userAgent: string | null | undefined,
): boolean {
  if (!userAgent) {
    // No UA is treated as non-mobile: fail closed toward the desktop gate so the
    // phone-only flow is never exposed to an unidentified client.
    return false;
  }

  return MOBILE_UA_PATTERN.test(userAgent);
}
