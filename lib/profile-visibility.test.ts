import { describe, expect, it } from 'vitest';

import { canViewProfile } from './profile-visibility';

describe('profile visibility', () => {
  it('lets every viewer, including anonymous visitors, see public profiles', () => {
    expect(canViewProfile('public', { isSelf: false, isFollower: false })).toBe(
      true,
    );
    expect(canViewProfile('public', { isSelf: false, isFollower: true })).toBe(
      true,
    );
  });

  it('keeps private profiles visible only to their owner', () => {
    expect(canViewProfile('private', { isSelf: true, isFollower: false })).toBe(
      true,
    );
    expect(canViewProfile('private', { isSelf: false, isFollower: true })).toBe(
      false,
    );
    expect(
      canViewProfile('private', { isSelf: false, isFollower: false }),
    ).toBe(false);
  });

  it('allows followers visibility only to followers and the owner', () => {
    expect(
      canViewProfile('followers', { isSelf: false, isFollower: true }),
    ).toBe(true);
    expect(
      canViewProfile('followers', { isSelf: false, isFollower: false }),
    ).toBe(false);
    expect(
      canViewProfile('followers', { isSelf: true, isFollower: false }),
    ).toBe(true);
  });
});
