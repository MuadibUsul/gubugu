import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getAdminRoleForUser, hasRequiredAdminRole } from './admin-access';
import { demoViewers } from './config/demo-viewers';

const ACCESS_KEYS = [
  'ADMIN_USER_EMAILS',
  'ADMIN_USER_IDS',
  'MODERATOR_USER_EMAILS',
  'MODERATOR_USER_IDS',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
] as const;

let saved: Record<string, string | undefined>;

function configureSupabase() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
}

const stranger = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'someone@example.com',
};

beforeEach(() => {
  saved = Object.fromEntries(ACCESS_KEYS.map((k) => [k, process.env[k]]));

  for (const key of ACCESS_KEYS) {
    delete process.env[key];
  }
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('getAdminRoleForUser allowlists', () => {
  it('grants admin by email, ignoring case and surrounding whitespace', () => {
    process.env.ADMIN_USER_EMAILS = ' Owner@Example.com , other@example.com';
    configureSupabase();

    expect(
      getAdminRoleForUser({ id: stranger.id, email: 'owner@EXAMPLE.com' }),
    ).toBe('admin');
  });

  it('grants admin by user id', () => {
    process.env.ADMIN_USER_IDS = stranger.id;
    configureSupabase();

    expect(getAdminRoleForUser({ id: stranger.id, email: null })).toBe('admin');
  });

  it('grants moderator from the moderator list', () => {
    process.env.MODERATOR_USER_EMAILS = stranger.email;
    configureSupabase();

    expect(getAdminRoleForUser(stranger)).toBe('moderator');
  });

  it('prefers admin when a user appears on both lists', () => {
    process.env.ADMIN_USER_EMAILS = stranger.email;
    process.env.MODERATOR_USER_EMAILS = stranger.email;
    configureSupabase();

    expect(getAdminRoleForUser(stranger)).toBe('admin');
  });

  it('returns null for a user on no list', () => {
    configureSupabase();

    expect(getAdminRoleForUser(stranger)).toBeNull();
  });

  it('does not treat an empty allowlist as matching an empty email', () => {
    process.env.ADMIN_USER_EMAILS = '';
    process.env.ADMIN_USER_IDS = ',, ,';
    configureSupabase();

    expect(getAdminRoleForUser({ id: stranger.id, email: null })).toBeNull();
  });
});

describe('getAdminRoleForUser demo fallback', () => {
  // This is the path that made an unconfigured production deploy dangerous:
  // with no Supabase env, signInAction issues a session without checking a
  // credential, and this function then hands that session the admin role.
  // server/env.ts now refuses to boot production in that state; these tests
  // pin the behaviour the guard exists to contain.
  it('grants admin to the collector demo viewer when Supabase is unconfigured', () => {
    expect(
      getAdminRoleForUser({ id: demoViewers.collector.userId, email: null }),
    ).toBe('admin');
  });

  it('grants moderator to the reviewer demo viewer when Supabase is unconfigured', () => {
    expect(
      getAdminRoleForUser({ id: demoViewers.reviewer.userId, email: null }),
    ).toBe('moderator');
  });

  it('grants nothing to the trader demo viewer', () => {
    expect(
      getAdminRoleForUser({ id: demoViewers.trader.userId, email: null }),
    ).toBeNull();
  });

  it('stops granting demo roles once Supabase is configured', () => {
    configureSupabase();

    expect(
      getAdminRoleForUser({ id: demoViewers.collector.userId, email: null }),
    ).toBeNull();
  });

  it('ignores a real user id that is not a demo viewer', () => {
    expect(getAdminRoleForUser({ id: stranger.id, email: null })).toBeNull();
  });
});

describe('hasRequiredAdminRole', () => {
  it('lets admin satisfy a moderator requirement', () => {
    expect(hasRequiredAdminRole('admin', 'moderator')).toBe(true);
    expect(hasRequiredAdminRole('admin', 'admin')).toBe(true);
  });

  it('does not let moderator satisfy an admin requirement', () => {
    expect(hasRequiredAdminRole('moderator', 'admin')).toBe(false);
  });

  it('lets moderator satisfy a moderator requirement', () => {
    expect(hasRequiredAdminRole('moderator', 'moderator')).toBe(true);
  });
});
