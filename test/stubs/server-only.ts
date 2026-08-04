// `server-only` throws when imported outside the Next server runtime, which
// blocks Vitest from importing any module under server/. Aliased in
// vitest.config.ts so those modules can be tested directly instead of having
// their logic copied into the test file.
export {};
