import { z } from 'zod';

import { apiSuccess } from '@/lib/api/envelope';
import { getUserGoodsStateMap } from '@/server/data/user-goods';

import { requireApiUser, runApiRoute } from '../_shared';

export async function GET(request: Request) {
  return runApiRoute(async () => {
    const user = await requireApiUser();
    if (user instanceof Response) return user;
    const goodsIds = z
      .array(z.string().uuid())
      .max(100)
      .parse(new URL(request.url).searchParams.getAll('goodsId'));
    if (!goodsIds.length) return apiSuccess({ items: [] });
    return apiSuccess({
      items: await getUserGoodsStateMap({ userId: user.id, goodsIds }),
    });
  });
}
