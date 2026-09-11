# Vendored OpenCV runtime

`opencv.js` is copied byte-for-byte from `jscanify@1.4.3/src/opencv.js`.
It is generated third-party code and is intentionally excluded from ESLint and
Prettier.

- Upstream: https://github.com/puffinsoft/jscanify
- Package version: `1.4.3`
- SHA-256: `d0e00ad06bb103acb0a3cba20d64c14367ab958bc6a5394b31aeec32610ef850`
- License: MIT; see `LICENSES/jscanify.txt`

When updating jscanify, copy the runtime again, refresh the hash, and verify the
camera crop flow before committing.
