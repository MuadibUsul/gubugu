import 'server-only';

import { forbidden } from 'next/navigation';

import {
  getAdminRoleForUser,
  hasRequiredAdminRole,
  type AdminRole,
} from '@/lib/admin-access';
import { requireAuthUser } from '@/server/auth/session';

export async function requireAdminRole(
  requiredRole: AdminRole,
  nextPath = '/admin',
) {
  const user = await requireAuthUser(nextPath);
  const adminRole = getAdminRoleForUser(user);

  if (!adminRole || !hasRequiredAdminRole(adminRole, requiredRole)) {
    forbidden();
  }

  return {
    ...user,
    adminRole,
  };
}

export async function requireModeratorAccess(nextPath = '/admin/moderation') {
  return requireAdminRole('moderator', nextPath);
}

export async function requireAdminAccess(nextPath = '/admin') {
  return requireAdminRole('admin', nextPath);
}
