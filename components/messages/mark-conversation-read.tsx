'use client';

import { useEffect } from 'react';

import { markConversationReadAction } from '@/server/messages/actions';

export function MarkConversationRead({
  conversationId,
}: {
  conversationId: string;
}) {
  useEffect(() => {
    const formData = new FormData();
    formData.set('conversationId', conversationId);
    void markConversationReadAction(formData);
  }, [conversationId]);

  return null;
}
