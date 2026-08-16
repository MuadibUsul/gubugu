import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// lib/admin-access.test.ts already covers role resolution and
// hasRequiredAdminRole. What is untested is the composition here: if
// requireAdminRole failed to call forbidden(), every correct decision
// underneath it would still end with the request being served.

const FORBIDDEN = new Error('forbidden() called');
const REDIRECT = new Error('redirect() called');

const forbidden = vi.fn(() => {
  throw FORBIDDEN;
});
const requireAuthUser = vi.fn();

vi.mock('next/navigation', () => ({
  forbidden: () => forbidden(),
  redirect: () => {
    throw REDIRECT;
  },
}));

vi.mock('@/server/auth/session', () => ({
  requireAuthUser: (nextPath?: string) => requireAuthUser(nextPath),
}));

const adminUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'boss@example.com',
  phone: null,
  handle: null,
  displayLabel: 'boss',
  provider: 'supabase',
};

const moderatorUser = { ...adminUser, email: 'mod@example.com' };
const plainUser = { ...adminUser, email: 'nobody@example.com' };

let previousEnv: Record<string, string | undefined>;

beforeEach(() => {
  previousEnv = {
    ADMIN_USER_EMAILS: process.env.ADMIN_USER_EMAILS,
    MODERATOR_USER_EMAILS: process.env.MODERATOR_USER_EMAILS,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  process.env.ADMIN_USER_EMAILS = 'boss@example.com';
  process.env.MODERATOR_USER_EMAILS = 'mod@example.com';
  // Configured Supabase disables the demo-viewer fallback, which is the
  // production shape.
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

  forbidden.mockClear();
  requireAuthUser.mockReset();
});

afterEach(() => {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('requireAdminRole', () => {
  it('returns the user with their role when the requirement is met', async () => {
    requireAuthUser.mockResolvedValue(adminUser);

    const { requireAdminRole } = await import('./admin');

    await expect(requireAdminRole('admin')).resolves.toMatchObject({
      id: adminUser.id,
      adminRole: 'admin',
    });
    expect(forbidden).not.toHaveBeenCalled();
  });

  it('lets an admin through a moderator requirement', async () => {
    requireAuthUser.mockResolvedValue(adminUser);

    const { requireAdminRole } = await import('./admin');

    await expect(requireAdminRole('moderator')).resolves.toMatchObject({
      adminRole: 'admin',
    });
    expect(forbidden).not.toHaveBeenCalled();
  });

  it('forbids a moderator from an admin-only requirement', async () => {
    requireAuthUser.mockResolvedValue(moderatorUser);

    const { requireAdminRole } = await import('./admin');

    await expect(requireAdminRole('admin')).rejects.toBe(FORBIDDEN);
    expect(forbidden).toHaveBeenCalledOnce();
  });

  it('forbids a user with no role at all', async () => {
    requireAuthUser.mockResolvedValue(plainUser);

    const { requireAdminRole } = await import('./admin');

    await expect(requireAdminRole('moderator')).rejects.toBe(FORBIDDEN);
    expect(forbidden).toHaveBeenCalledOnce();
  });

  it('passes the return path down so the login redirect can come back', async () => {
    requireAuthUser.mockResolvedValue(adminUser);

    const { requireAdminRole } = await import('./admin');
    await requireAdminRole('admin', '/admin/goods');

    expect(requireAuthUser).toHaveBeenCalledWith('/admin/goods');
  });
});

describe('access helpers', () => {
  it('requireModeratorAccess admits a moderator', async () => {
    requireAuthUser.mockResolvedValue(moderatorUser);

    const { requireModeratorAccess } = await import('./admin');

    await expect(requireModeratorAccess()).resolves.toMatchObject({
      adminRole: 'moderator',
    });
  });

  it('requireAdminAccess rejects a moderator', async () => {
    requireAuthUser.mockResolvedValue(moderatorUser);

    const { requireAdminAccess } = await import('./admin');

    await expect(requireAdminAccess()).rejects.toBe(FORBIDDEN);
  });

  it('each helper defaults to its own return path', async () => {
    requireAuthUser.mockResolvedValue(adminUser);

    const { requireAdminAccess, requireModeratorAccess } =
      await import('./admin');

    await requireAdminAccess();
    expect(requireAuthUser).toHaveBeenCalledWith('/admin');

    await requireModeratorAccess();
    expect(requireAuthUser).toHaveBeenCalledWith('/admin/moderation');
  });
});
