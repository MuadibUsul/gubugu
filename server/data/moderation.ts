import 'server-only';

import { desc, eq, inArray } from 'drizzle-orm';

import {
  catalogSubmissions,
  directMessages,
  postImages,
  posts,
  reports,
} from '@/drizzle/schema';
import type { ModerationStatus } from '@/lib/moderation';
import { getDb, isDatabaseAccessConfigurationError } from '@/server/db/client';

type ModerationCounts = Record<ModerationStatus, number>;

export type CatalogSubmissionQueueItem = {
  id: string;
  targetType: string;
  submissionType: string;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  createdAt: Date;
};

export type PhotoModerationQueueItem = {
  id: string;
  postId: string;
  imageUrl: string;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  createdAt: Date;
};

export type CommentModerationQueueItem = {
  id: string;
  body: string;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  createdAt: Date;
};

export type ReportQueueItem = {
  id: string;
  targetType: 'post' | 'exchange_listing' | 'exchange' | 'message';
  targetId: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'rejected';
  resolutionNote: string | null;
  targetExcerpt: string | null;
  targetActorId: string | null;
  targetCreatedAt: Date | null;
  createdAt: Date;
};

export type ModerationModuleSummary = {
  key: 'catalog-submissions' | 'photo-uploads' | 'comments' | 'reports';
  label: string;
  counts: ModerationCounts;
};

export type ModerationQueueData = {
  mode: 'live' | 'fallback';
  generatedAt: Date;
  modules: ModerationModuleSummary[];
  catalogSubmissions: CatalogSubmissionQueueItem[];
  photoUploads: PhotoModerationQueueItem[];
  comments: CommentModerationQueueItem[];
  reports: ReportQueueItem[];
};

function counts(rows: Array<{ moderationStatus: ModerationStatus }>) {
  return rows.reduce<ModerationCounts>(
    (result, row) => {
      result[row.moderationStatus] += 1;
      return result;
    },
    { pending: 0, approved: 0, rejected: 0 },
  );
}

export async function getModerationQueueData(): Promise<ModerationQueueData> {
  try {
    const db = getDb();
    const [catalogRows, photoRows, commentRows, reportRows] = await Promise.all(
      [
        db
          .select()
          .from(catalogSubmissions)
          .where(eq(catalogSubmissions.moderationStatus, 'pending'))
          .orderBy(desc(catalogSubmissions.createdAt))
          .limit(50),
        db
          .select()
          .from(postImages)
          .where(eq(postImages.moderationStatus, 'pending'))
          .orderBy(desc(postImages.createdAt))
          .limit(50),
        db
          .select()
          .from(posts)
          .where(eq(posts.moderationStatus, 'pending'))
          .orderBy(desc(posts.createdAt))
          .limit(50),
        db
          .select()
          .from(reports)
          .where(eq(reports.status, 'pending'))
          .orderBy(desc(reports.createdAt))
          .limit(100),
      ],
    );

    const catalogCounts = counts(catalogRows);
    const photoCounts = counts(photoRows);
    const commentCounts = counts(commentRows);
    const reportCounts: ModerationCounts = {
      pending: reportRows.filter((row) => row.status === 'pending').length,
      approved: reportRows.filter((row) => row.status === 'resolved').length,
      rejected: reportRows.filter((row) => row.status === 'rejected').length,
    };
    const messageIds = reportRows.flatMap((row) =>
      row.targetType === 'message' ? [row.targetId] : [],
    );
    const reportedMessages = messageIds.length
      ? await db
          .select({
            id: directMessages.id,
            body: directMessages.body,
            senderId: directMessages.senderId,
            createdAt: directMessages.createdAt,
          })
          .from(directMessages)
          .where(inArray(directMessages.id, messageIds))
      : [];
    const messageById = new Map(
      reportedMessages.map((message) => [message.id, message]),
    );

    return {
      mode: 'live',
      generatedAt: new Date(),
      modules: [
        {
          key: 'catalog-submissions',
          label: '图鉴投稿',
          counts: catalogCounts,
        },
        { key: 'photo-uploads', label: '图片', counts: photoCounts },
        { key: 'comments', label: '评论', counts: commentCounts },
        { key: 'reports', label: '举报', counts: reportCounts },
      ],
      catalogSubmissions: catalogRows.map((row) => ({
        id: row.id,
        targetType: row.targetEntityType,
        submissionType: row.submissionType,
        moderationStatus: row.moderationStatus,
        reviewNote: row.reviewNote,
        createdAt: row.createdAt,
      })),
      photoUploads: photoRows,
      comments: commentRows,
      reports: reportRows.map((row) => {
        const message =
          row.targetType === 'message'
            ? messageById.get(row.targetId)
            : undefined;
        return {
          ...row,
          targetExcerpt: message?.body.slice(0, 500) ?? null,
          targetActorId: message?.senderId ?? null,
          targetCreatedAt: message?.createdAt ?? null,
        };
      }),
    };
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) throw error;
    return {
      mode: 'fallback',
      generatedAt: new Date(),
      modules: [],
      catalogSubmissions: [],
      photoUploads: [],
      comments: [],
      reports: [],
    };
  }
}
