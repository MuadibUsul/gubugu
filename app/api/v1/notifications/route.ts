import { apiSuccess } from '@/lib/api/envelope';
import { listNotificationsForUser } from '@/server/data/notifications';

import { requireApiUser, runApiRoute } from '../_shared';

export async function GET() {
  return runApiRoute(async () => {
    const user = await requireApiUser();
    if (user instanceof Response) return user;
    return apiSuccess(await listNotificationsForUser({ userId: user.id }));
  });
}
