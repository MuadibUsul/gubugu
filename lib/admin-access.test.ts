import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAdminRoleForUser, hasRequiredAdminRole } from './admin-access';
import { demoViewers } from './config/demo-viewers';

const ACCESS_KEYS = [
  'ADMIN_USER_EMAILS',
  'ADMIN_USER_IDS',
  'MODERATOR_USER_EMAILS',
  'MODERATOR_USER_IDS',
] as const;

let saved: Record<string, string | undefined>;

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

    expect(
      getAdminRoleForUser({ id: stranger.id, email: 'owner@EXAMPLE.com' }),
    ).toBe('admin');
  });

  it('grants admin by user id', () => {
    process.env.ADMIN_USER_IDS = stranger.id;

    expect(getAdminRoleForUser({ id: stranger.id, email: null })).toBe('admin');
  });

  it('grants moderator from the moderator list', () => {
    process.env.MODERATOR_USER_EMAILS = stranger.email;

    expect(getAdminRoleForUser(stranger)).toBe('moderator');
  });

  it('prefers admin when a user appears on both lists', () => {
    process.env.ADMIN_USER_EMAILS = stranger.email;
    process.env.MODERATOR_USER_EMAILS = stranger.email;

    expect(getAdminRoleForUser(stranger)).toBe('admin');
  });

  it('returns null for a user on no list', () => {
    expect(getAdminRoleForUser(stranger)).toBeNull();
  });

  it('does not treat an empty allowlist as matching an empty email', () => {
    process.env.ADMIN_USER_EMAILS = '';
    process.env.ADMIN_USER_IDS = ',, ,';

    expect(getAdminRoleForUser({ id: stranger.id, email: null })).toBeNull();
  });
});

describe('getAdminRoleForUser demo fallback', () => {
  // 种子的演示账号口令硬编码在仓库里，这个回退等于把后台交给读过源码的人。
  // 它只在非生产环境保留（方便本地验收），生产由下面那条用例锁住。
  it('grants admin to the collector demo viewer outside production', () => {
    expect(
      getAdminRoleForUser({ id: demoViewers.collector.userId, email: null }),
    ).toBe('admin');
  });

  it('grants moderator to the reviewer demo viewer outside production', () => {
    expect(
      getAdminRoleForUser({ id: demoViewers.reviewer.userId, email: null }),
    ).toBe('moderator');
  });

  it('grants nothing to the trader demo viewer', () => {
    expect(
      getAdminRoleForUser({ id: demoViewers.trader.userId, email: null }),
    ).toBeNull();
  });

  it('ignores a real user id that is not a demo viewer', () => {
    expect(getAdminRoleForUser({ id: stranger.id, email: null })).toBeNull();
  });

  // 种子里的演示账号口令（gubugu-demo）就写在仓库中。自托管认证的生产站点上，
  // 这个回退等于把后台交给任何读过源码的人，因此必须在生产环境完全关闭。
  it('never grants demo roles in production, where the seeded password is public', () => {
    vi.stubEnv('NODE_ENV', 'production');

    try {
      expect(
        getAdminRoleForUser({ id: demoViewers.collector.userId, email: null }),
      ).toBeNull();
      expect(
        getAdminRoleForUser({ id: demoViewers.reviewer.userId, email: null }),
      ).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
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
