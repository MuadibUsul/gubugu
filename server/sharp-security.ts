import 'server-only';

import sharp from 'sharp';

// Temporary mitigation for GHSA-f88m-g3jw-g9cj and GHSA-rgj7-g3m4-5g8c.
// Remove this block and the audit exceptions together after upgrading sharp.
sharp.block({
  operation: [
    'VipsForeignLoadHeif',
    'VipsForeignLoadNsgif',
    'VipsForeignLoadTiff',
    'VipsForeignLoadVips',
  ],
});
