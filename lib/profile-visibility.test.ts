import { describe, expect, it } from 'vitest';

import { canViewProfile } from './profile-visibility';

describe('profile visibility', () => {
  it('keeps private profiles visible only to their owner', () => {
    expect(canViewProfile('private', { isSelf: true, isFollower: false })).toBe(
      true,
    );
    expect(canViewProfile('private', { isSelf: false, isFollower: true })).toBe(
      false,
    );
  });

  it('allows followers visibility only to followers and the owner', () => {
    expect(
      canViewProfile('followers', { isSelf: false, isFollower: true }),
    ).toBe(true);
    expect(
      canViewProfile('followers', { isSelf: false, isFollower: false }),
    ).toBe(false);
  });
});
