import { apiSuccess } from '@/lib/api/envelope';
import { getMatchesForUser } from '@/server/data/matching';

import { requireApiUser, runApiRoute } from '../_shared';

export async function GET() {
  return runApiRoute(async () => {
    const user = await requireApiUser();
    if (user instanceof Response) return user;
    return apiSuccess(await getMatchesForUser(user.id));
  });
}
