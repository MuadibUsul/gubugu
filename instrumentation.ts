export async function register() {
  // Validating here rather than at module scope in next.config.ts keeps the
  // check in the runtime that actually reads the variables, and skips it on
  // the edge runtime where the server-only names are not available.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./server/env');
  }
}
