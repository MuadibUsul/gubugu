import { demoViewerEntries, demoViewers } from '../../lib/config/demo-viewers';

type DemoViewerProfile = (typeof demoViewers)[keyof typeof demoViewers];

// The demo viewers are the fixture that local development signs in as, so the
// seeded profile rows have to carry the same ids. Deriving them here keeps
// lib/config/demo-viewers.ts the single source of truth rather than repeating
// three UUIDs in a second place.
export const profileSeed = (
  demoViewerEntries as Array<[string, DemoViewerProfile]>
).map(([, viewer]) => ({
  id: viewer.userId,
  handle: viewer.handle.replace(/^@/, '').toLowerCase(),
  displayName: viewer.displayName,
  avatarImageUrl: null,
  bio: viewer.bio,
  city: viewer.city,
  accentTitle: viewer.accentTitle,
  visibility: 'public' as const,
}));
