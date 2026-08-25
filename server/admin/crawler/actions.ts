'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { crawlerDrafts, crawlerSources } from '@/drizzle/schema';
import { requireAdminAccess } from '@/server/auth/admin';
import {
  ingestManualUrl,
  runCrawlerSourceById,
  runManualCrawlerSweep,
} from '@/server/catalog-crawler/service';
import { getDb } from '@/server/db/client';

const optionalText = (maxLength: number) =>
  z
    .union([z.string(), z.undefined(), z.null()])
    .transform((value) => (typeof value === 'string' ? value.trim() : ''))
    .refine((value) => value.length <= maxLength)
    .transform((value) => (value ? value : null));

const sourceFormSchema = z.object({
  sourceId: z
    .union([z.string().uuid(), z.literal(''), z.undefined(), z.null()])
    .transform((value) => value || undefined),
  name: z.string().trim().min(1).max(120),
  entryUrl: z.string().trim().url().max(2000),
  detailPathPattern: optionalText(255),
  allowedImageHosts: optionalText(4000),
});

const idFormSchema = z.object({ sourceId: z.string().uuid() });
const rejectFormSchema = z.object({
  draftId: z.string().uuid(),
  reviewNote: z.string().trim().max(2000).optional().default(''),
});

function normalizeEntryUrl(value: string) {
  const url = new URL(value);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('来源只允许 HTTP 或 HTTPS 地址。');
  }

  if (url.username || url.password) {
    throw new Error('来源地址不能包含账号或密码。');
  }

  if (
    (url.protocol === 'https:' && url.port && url.port !== '443') ||
    (url.protocol === 'http:' && url.port && url.port !== '80')
  ) {
    throw new Error('来源地址不能使用非标准端口。');
  }

  url.hash = '';
  return url.toString();
}

function normalizeAllowedImageHosts(value: string | null) {
  // The source host itself is always allowed by the runner and does not need
  // to be duplicated in this "extra hosts" field.
  const hosts = new Set<string>();

  for (const raw of (value ?? '').split(/[\s,]+/)) {
    const item = raw.trim();
    if (!item) continue;

    let host: string;
    try {
      host = item.includes('://')
        ? new URL(item).hostname.toLowerCase()
        : new URL(`https://${item}`).hostname.toLowerCase();
    } catch {
      throw new Error(`图片域名无效：${item}`);
    }

    if (!/^[a-z0-9.-]+$/.test(host) || host.startsWith('.')) {
      throw new Error(`图片域名无效：${item}`);
    }

    hosts.add(host);
  }

  return [...hosts].slice(0, 24);
}

function crawlerPath(params: Record<string, string>) {
  return `/admin/crawler?${new URLSearchParams(params).toString()}`;
}

export async function saveCrawlerSourceAction(formData: FormData) {
  const viewer = await requireAdminAccess('/admin/crawler');
  const parsed = sourceFormSchema.safeParse({
    sourceId: formData.get('sourceId'),
    name: formData.get('name'),
    entryUrl: formData.get('entryUrl'),
    detailPathPattern: formData.get('detailPathPattern'),
    allowedImageHosts: formData.get('allowedImageHosts'),
  });

  if (!parsed.success) {
    redirect(crawlerPath({ view: 'sources', error: 'invalid-source' }));
  }

  let entryUrl: string;
  let allowedImageHosts: string[];

  try {
    entryUrl = normalizeEntryUrl(parsed.data.entryUrl);
    allowedImageHosts = normalizeAllowedImageHosts(
      parsed.data.allowedImageHosts,
    );
  } catch {
    redirect(crawlerPath({ view: 'sources', error: 'invalid-url' }));
  }

  const db = getDb();
  const now = new Date();

  try {
    if (parsed.data.sourceId) {
      await db
        .update(crawlerSources)
        .set({
          name: parsed.data.name,
          entryUrl,
          detailPathPattern: parsed.data.detailPathPattern,
          allowedImageHosts,
          updatedAt: now,
        })
        .where(eq(crawlerSources.id, parsed.data.sourceId));
    } else {
      await db.insert(crawlerSources).values({
        name: parsed.data.name,
        entryUrl,
        detailPathPattern: parsed.data.detailPathPattern,
        allowedImageHosts,
        createdBy: viewer.id,
      });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('crawler_sources_entry_url_unique')
    ) {
      redirect(crawlerPath({ view: 'sources', error: 'duplicate-source' }));
    }
    throw error;
  }

  revalidatePath('/admin/crawler');
  redirect(crawlerPath({ view: 'sources', notice: 'source-saved' }));
}

export async function toggleCrawlerSourceAction(formData: FormData) {
  await requireAdminAccess('/admin/crawler');
  const parsed = idFormSchema.safeParse({ sourceId: formData.get('sourceId') });

  if (!parsed.success) redirect('/admin/crawler?view=sources');

  const db = getDb();
  const rows = await db
    .select({ enabled: crawlerSources.enabled })
    .from(crawlerSources)
    .where(eq(crawlerSources.id, parsed.data.sourceId))
    .limit(1);

  if (rows[0]) {
    await db
      .update(crawlerSources)
      .set({ enabled: !rows[0].enabled, updatedAt: new Date() })
      .where(eq(crawlerSources.id, parsed.data.sourceId));
  }

  revalidatePath('/admin/crawler');
  redirect(crawlerPath({ view: 'sources', notice: 'source-toggled' }));
}

export async function scanCrawlerSourceAction(formData: FormData) {
  await requireAdminAccess('/admin/crawler');
  const parsed = idFormSchema.safeParse({ sourceId: formData.get('sourceId') });

  if (!parsed.success) redirect('/admin/crawler?view=sources');

  // 全量爬取可长达数十分钟；绝不在请求里等它跑完，否则「扫描」按钮会一直卡住、看着像失败。
  // 后台异步启动，运行状态写进 crawler_runs，页面刷新即可看进度；claimRun 的唯一约束会挡住
  // 重复触发。错误吞掉以免未处理拒绝——它们已记录在 run / source 行上，可在运行记录里看到。
  void runCrawlerSourceById(parsed.data.sourceId, {
    trigger: 'manual',
    scheduledFor: null,
  }).catch(() => {});

  redirect(crawlerPath({ view: 'runs', notice: 'scan-started' }));
}

export async function scanAllCrawlerSourcesAction() {
  await requireAdminAccess('/admin/crawler');
  // 同上：全站轮扫可能更久，后台异步启动、立即返回，进度看运行记录。
  void runManualCrawlerSweep().catch(() => {});
  redirect(crawlerPath({ view: 'runs', notice: 'scan-started' }));
}

const manualUrlSchema = z.object({ url: z.string().trim().url().max(2000) });

export async function ingestManualUrlAction(formData: FormData) {
  const viewer = await requireAdminAccess('/admin/crawler');
  const parsed = manualUrlSchema.safeParse({ url: formData.get('url') });
  if (!parsed.success) {
    redirect(crawlerPath({ view: 'sources', error: 'manual-invalid' }));
  }

  let result: Awaited<ReturnType<typeof ingestManualUrl>>;
  try {
    result = await ingestManualUrl(parsed.data.url, viewer.id);
  } catch {
    redirect(crawlerPath({ view: 'sources', error: 'manual-error' }));
  }

  if (result.status === 'empty') {
    redirect(crawlerPath({ view: 'sources', error: 'manual-empty' }));
  }

  revalidatePath('/admin/crawler');
  redirect(`/admin/crawler/drafts/${result.draftId}`);
}

export async function rejectCrawlerDraftAction(formData: FormData) {
  const viewer = await requireAdminAccess('/admin/crawler');
  const parsed = rejectFormSchema.safeParse({
    draftId: formData.get('draftId'),
    reviewNote:
      typeof formData.get('reviewNote') === 'string'
        ? formData.get('reviewNote')
        : undefined,
  });

  if (!parsed.success) redirect('/admin/crawler?view=drafts');

  const db = getDb();
  const now = new Date();
  await db
    .update(crawlerDrafts)
    .set({
      status: 'rejected',
      reviewNote: parsed.data.reviewNote || null,
      reviewedBy: viewer.id,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(crawlerDrafts.id, parsed.data.draftId),
        eq(crawlerDrafts.status, 'pending'),
      ),
    );

  revalidatePath('/admin/crawler');
  redirect(crawlerPath({ view: 'drafts', notice: 'draft-rejected' }));
}
