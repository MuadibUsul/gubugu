import { apiSuccess } from '@/lib/api/envelope';
import { listExchangesForUser } from '@/server/data/exchanges';

import { requireApiUser, runApiRoute } from '../_shared';

export async function GET() {
  return runApiRoute(async () => {
    const user = await requireApiUser();
    if (user instanceof Response) return user;
    return apiSuccess(await listExchangesForUser({ userId: user.id }));
  });
}
