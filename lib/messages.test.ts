import { describe, expect, it } from 'vitest';

import {
  conversationPartner,
  messageBodySchema,
  normalizeConversationMembers,
} from './messages';

describe('private messaging boundaries', () => {
  it('keeps one stable order for either participant direction', () => {
    expect(normalizeConversationMembers('b', 'a')).toEqual(['a', 'b']);
    expect(normalizeConversationMembers('a', 'b')).toEqual(['a', 'b']);
    expect(normalizeConversationMembers('a', 'a')).toBeNull();
  });

  it('never resolves a partner for a non-participant', () => {
    expect(conversationPartner('a', 'b', 'a')).toBe('b');
    expect(conversationPartner('a', 'b', 'b')).toBe('a');
    expect(conversationPartner('a', 'b', 'c')).toBeNull();
  });

  it('rejects blank and oversized messages at the boundary', () => {
    expect(messageBodySchema.safeParse('  ').success).toBe(false);
    expect(messageBodySchema.parse('  hello  ')).toBe('hello');
    expect(messageBodySchema.safeParse('x'.repeat(1001)).success).toBe(false);
  });
});
