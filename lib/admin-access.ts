import { z } from 'zod';

import { findDemoViewerKeyByUserId } from '@/lib/config/demo-viewers';
import { getLocalDemoAdminRole } from '@/lib/auth/local-demo';
import { getSupabaseAuthConfig } from '@/lib/supabase/config';

import type { AuthUser } from '@/server/auth/types';

export const adminRoleValues = ['moderator', 'admin'] as const;

export type AdminRole = (typeof adminRoleValues)[number];

const adminAccessEnvSchema = z.object({
  ADMIN_USER_EMAILS: z.string().optional(),
  ADMIN_USER_IDS: z.string().optional(),
  MODERATOR_USER_EMAILS: z.string().optional(),
  MODERATOR_USER_IDS: z.string().optional(),
});

function parseCsvList(value: string | undefined) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getAdminAccessConfig() {
  const env = adminAccessEnvSchema.parse({
    ADMIN_USER_EMAILS: process.env.ADMIN_USER_EMAILS,
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
    MODERATOR_USER_EMAILS: process.env.MODERATOR_USER_EMAILS,
    MODERATOR_USER_IDS: process.env.MODERATOR_USER_IDS,
  });

  return {
    adminEmails: parseCsvList(env.ADMIN_USER_EMAILS),
    adminUserIds: parseCsvList(env.ADMIN_USER_IDS),
    moderatorEmails: parseCsvList(env.MODERATOR_USER_EMAILS),
    moderatorUserIds: parseCsvList(env.MODERATOR_USER_IDS),
  };
}

export function getAdminRoleForUser(
  user: Pick<AuthUser, 'id' | 'email'>,
): AdminRole | null {
  const config = getAdminAccessConfig();
  const normalizedEmail = user.email?.trim().toLowerCase() ?? null;
  const normalizedUserId = user.id.trim().toLowerCase();

  if (
    config.adminUserIds.has(normalizedUserId) ||
    (normalizedEmail !== null && config.adminEmails.has(normalizedEmail))
  ) {
    return 'admin';
  }

  if (
    config.moderatorUserIds.has(normalizedUserId) ||
    (normalizedEmail !== null && config.moderatorEmails.has(normalizedEmail))
  ) {
    return 'moderator';
  }

  if (!getSupabaseAuthConfig()) {
    const demoViewerKey = findDemoViewerKeyByUserId(user.id);

    if (demoViewerKey) {
      return getLocalDemoAdminRole(demoViewerKey);
    }
  }

  return null;
}

export function hasRequiredAdminRole(
  currentRole: AdminRole,
  requiredRole: AdminRole,
) {
  if (currentRole === 'admin') {
    return true;
  }

  return currentRole === requiredRole;
}
