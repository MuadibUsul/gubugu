import { z } from 'zod';

export const messageBodySchema = z.string().trim().min(1).max(1000);

export function normalizeConversationMembers(
  firstId: string,
  secondId: string,
) {
  if (firstId === secondId) return null;
  return firstId < secondId
    ? ([firstId, secondId] as const)
    : ([secondId, firstId] as const);
}

export function conversationPartner(
  memberAId: string,
  memberBId: string,
  viewerId: string,
) {
  if (viewerId === memberAId) return memberBId;
  if (viewerId === memberBId) return memberAId;
  return null;
}
