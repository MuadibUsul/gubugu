import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { MarkConversationRead } from '@/components/messages/mark-conversation-read';
import { MessageThread } from '@/components/messages/message-thread';
import { requireAuthUser } from '@/server/auth/session';
import { getConversationThread } from '@/server/data/messages';

export const metadata: Metadata = { title: '私信会话 · 谷布谷图鉴' };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { conversationId } = await params;
  const user = await requireAuthUser(`/me/messages/${conversationId}`);
  const [thread, query] = await Promise.all([
    getConversationThread({ conversationId, viewerId: user.id }),
    searchParams,
  ]);
  if (!thread) notFound();
  const contextResult = z
    .object({
      contextType: z.enum(['listing', 'offer', 'exchange']),
      contextId: z.string().uuid(),
    })
    .safeParse({
      contextType: one(query.contextType),
      contextId: one(query.contextId),
    });
  const context = contextResult.success
    ? {
        type: contextResult.data.contextType,
        id: contextResult.data.contextId,
        href:
          contextResult.data.contextType === 'listing'
            ? `/matches/${contextResult.data.contextId}`
            : contextResult.data.contextType === 'offer'
              ? `/matches/offers/${contextResult.data.contextId}`
              : `/me/exchanges#exchange-${contextResult.data.contextId}`,
        label:
          contextResult.data.contextType === 'listing'
            ? '返回关联换谷帖'
            : contextResult.data.contextType === 'offer'
              ? '返回关联正式方案'
              : '返回关联换谷单',
      }
    : undefined;

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pt-4 pb-16 sm:px-6 md:px-8 md:pt-6">
      <Link
        className="mb-4 inline-flex min-h-10 items-center text-sm text-[var(--shu)]"
        href="/me/messages"
      >
        ← 返回私信
      </Link>
      <MarkConversationRead conversationId={thread.id} />
      <MessageThread
        context={context}
        feedback={one(query.message)}
        thread={thread}
        viewerId={user.id}
      />
    </main>
  );
}
