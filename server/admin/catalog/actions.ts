'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { characters, ips, series } from '@/drizzle/schema';
import { slugifyText } from '@/lib/slug';
import type { SaveAdminCatalogEntityActionState } from '@/server/admin/catalog/action-state';
import { requireAdminAccess } from '@/server/auth/admin';
import { getDb } from '@/server/db/client';

const entityStatusValues = ['draft', 'published', 'archived'] as const;

const optionalFormStringSchema = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => (typeof value === 'string' ? value.trim() : ''));

const optionalUuidFormSchema = optionalFormStringSchema
  .refine(
    (value) => value.length === 0 || z.string().uuid().safeParse(value).success,
    {
      message: '标识符无效。',
    },
  )
  .transform((value) => (value.length > 0 ? value : undefined));

const optionalTextFieldSchema = (maxLength: number) =>
  optionalFormStringSchema
    .refine((value) => value.length <= maxLength, {
      message: `该字段请控制在 ${maxLength} 个字符以内。`,
    })
    .transform((value) => (value.length > 0 ? value : null));

const requiredTextFieldSchema = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `必须填写${label}。`)
    .max(maxLength, `${label}请控制在 ${maxLength} 个字符以内。`);

const slugFieldSchema = requiredTextFieldSchema('Slug', 128)
  .transform((value) => slugifyText(value))
  .refine((value) => value.length > 0, {
    message: 'Slug 必须包含字母或数字。',
  })
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: 'Slug 只能包含小写字母、数字和连字符。',
  });

const optionalUrlFieldSchema = optionalFormStringSchema
  .refine(
    (value) => value.length === 0 || z.string().url().safeParse(value).success,
    {
      message: '请输入完整的 URL。',
    },
  )
  .transform((value) => (value.length > 0 ? value : null));

const optionalStatusFormSchema = z
  .union([z.enum(entityStatusValues), z.literal(''), z.undefined(), z.null()])
  .transform((value) => (value ? value : undefined));

const optionalDateFieldSchema = optionalFormStringSchema
  .refine((value) => value.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: '发售日期请使用 YYYY-MM-DD 格式。',
  })
  .transform((value) => {
    if (!value) {
      return null;
    }

    return new Date(`${value}T00:00:00.000Z`);
  })
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: '发售日期无效。',
  });

const returnFieldsSchema = z.object({
  recordId: optionalUuidFormSchema,
  returnQuery: optionalFormStringSchema
    .refine((value) => value.length <= 100, {
      message: '返回查询词过长。',
    })
    .transform((value) => (value.length > 0 ? value : undefined)),
  returnStatus: optionalStatusFormSchema,
  returnIpId: optionalUuidFormSchema,
});

const saveIpInputSchema = returnFieldsSchema.extend({
  entity: z.literal('ip'),
  slug: slugFieldSchema,
  name: requiredTextFieldSchema('名称', 255),
  nameLocalized: optionalTextFieldSchema(255),
  description: optionalTextFieldSchema(4000),
  coverImageUrl: optionalUrlFieldSchema,
  status: z.enum(entityStatusValues),
});

const saveCharacterInputSchema = returnFieldsSchema.extend({
  entity: z.literal('character'),
  ipId: z.string().uuid('必须选择 IP。'),
  slug: slugFieldSchema,
  name: requiredTextFieldSchema('名称', 255),
  nameLocalized: optionalTextFieldSchema(255),
  description: optionalTextFieldSchema(4000),
  avatarImageUrl: optionalUrlFieldSchema,
  status: z.enum(entityStatusValues),
});

const saveSeriesInputSchema = returnFieldsSchema.extend({
  entity: z.literal('series'),
  ipId: z.string().uuid('必须选择 IP。'),
  slug: slugFieldSchema,
  name: requiredTextFieldSchema('名称', 255),
  description: optionalTextFieldSchema(4000),
  coverImageUrl: optionalUrlFieldSchema,
  seriesType: requiredTextFieldSchema('系列类型', 64),
  releaseDate: optionalDateFieldSchema,
  status: z.enum(entityStatusValues),
});

const saveAdminCatalogEntityInputSchema = z.discriminatedUnion('entity', [
  saveIpInputSchema,
  saveCharacterInputSchema,
  saveSeriesInputSchema,
]);

function buildReturnPath(
  input: z.output<typeof saveAdminCatalogEntityInputSchema>,
  recordId: string,
) {
  const params = new URLSearchParams();

  params.set('entity', input.entity);

  if (input.returnQuery) {
    params.set('query', input.returnQuery);
  }

  if (input.returnStatus) {
    params.set('status', input.returnStatus);
  }

  if (input.entity !== 'ip' && input.returnIpId) {
    params.set('ipId', input.returnIpId);
  }

  params.set('recordId', recordId);

  return `/admin/catalog?${params.toString()}`;
}

function mapDatabaseError(error: unknown): SaveAdminCatalogEntityActionState {
  if (error instanceof Error) {
    if (error.message.includes('ips_slug_unique')) {
      return {
        status: 'error',
        message: 'IP slug 已存在，请使用唯一值。',
      };
    }

    if (error.message.includes('characters_ip_id_slug_unique')) {
      return {
        status: 'error',
        message: '所选 IP 下已存在同名角色 slug。',
      };
    }

    if (error.message.includes('series_ip_id_slug_unique')) {
      return {
        status: 'error',
        message: '所选 IP 下已存在同名系列 slug。',
      };
    }
  }

  return {
    status: 'error',
    message: '保存图鉴数据失败，请检查提交字段后重试。',
  };
}

export async function saveAdminCatalogEntityAction(
  _previousState: SaveAdminCatalogEntityActionState,
  formData: FormData,
): Promise<SaveAdminCatalogEntityActionState> {
  await requireAdminAccess('/admin/catalog');

  const parsed = saveAdminCatalogEntityInputSchema.safeParse({
    entity: formData.get('entity'),
    recordId: formData.get('recordId'),
    returnQuery: formData.get('returnQuery'),
    returnStatus: formData.get('returnStatus'),
    returnIpId: formData.get('returnIpId'),
    ipId: formData.get('ipId'),
    slug: formData.get('slug'),
    name: formData.get('name'),
    nameLocalized: formData.get('nameLocalized'),
    description: formData.get('description'),
    coverImageUrl: formData.get('coverImageUrl'),
    avatarImageUrl: formData.get('avatarImageUrl'),
    seriesType: formData.get('seriesType'),
    releaseDate: formData.get('releaseDate'),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? '图鉴管理请求参数无效。',
    };
  }

  const db = getDb();
  const now = new Date();

  try {
    if (parsed.data.entity === 'ip') {
      const {
        recordId,
        slug,
        name,
        nameLocalized,
        description,
        coverImageUrl,
        status,
      } = parsed.data;

      const [existingRows, conflictRows] = await Promise.all([
        recordId
          ? db
              .select({
                id: ips.id,
                slug: ips.slug,
              })
              .from(ips)
              .where(eq(ips.id, recordId))
              .limit(1)
          : Promise.resolve([]),
        db
          .select({
            id: ips.id,
          })
          .from(ips)
          .where(
            and(
              eq(ips.slug, slug),
              recordId ? ne(ips.id, recordId) : undefined,
            ),
          )
          .limit(1),
      ]);

      const existing = existingRows[0] ?? null;

      if (recordId && !existing) {
        return {
          status: 'error',
          message: '未找到正在编辑的 IP 记录。',
        };
      }

      if (conflictRows[0]) {
        return {
          status: 'error',
          message: 'IP slug 已存在，请使用唯一值。',
        };
      }

      const nextId = recordId ?? crypto.randomUUID();

      if (recordId) {
        await db
          .update(ips)
          .set({
            slug,
            name,
            nameLocalized,
            description,
            coverImageUrl,
            status,
            updatedAt: now,
          })
          .where(eq(ips.id, nextId));
      } else {
        await db.insert(ips).values({
          id: nextId,
          slug,
          name,
          nameLocalized,
          description,
          coverImageUrl,
          status,
        });
      }

      revalidatePath('/admin');
      revalidatePath('/admin/catalog');
      revalidatePath('/search');
      revalidatePath('/');

      if (existing?.slug) {
        revalidatePath(`/ips/${existing.slug}`);
      }

      revalidatePath(`/ips/${slug}`);
      redirect(buildReturnPath(parsed.data, nextId));
    }

    if (parsed.data.entity === 'character') {
      const {
        recordId,
        ipId,
        slug,
        name,
        nameLocalized,
        description,
        avatarImageUrl,
        status,
      } = parsed.data;

      const [ipRows, existingRows, conflictRows] = await Promise.all([
        db
          .select({
            id: ips.id,
            slug: ips.slug,
          })
          .from(ips)
          .where(eq(ips.id, ipId))
          .limit(1),
        recordId
          ? db
              .select({
                id: characters.id,
                slug: characters.slug,
                ipSlug: ips.slug,
              })
              .from(characters)
              .innerJoin(ips, eq(characters.ipId, ips.id))
              .where(eq(characters.id, recordId))
              .limit(1)
          : Promise.resolve([]),
        db
          .select({
            id: characters.id,
          })
          .from(characters)
          .where(
            and(
              eq(characters.ipId, ipId),
              eq(characters.slug, slug),
              recordId ? ne(characters.id, recordId) : undefined,
            ),
          )
          .limit(1),
      ]);

      const ipRow = ipRows[0];
      const existing = existingRows[0] ?? null;

      if (!ipRow) {
        return {
          status: 'error',
          message: '所选 IP 已不存在。',
        };
      }

      if (recordId && !existing) {
        return {
          status: 'error',
          message: '未找到正在编辑的角色记录。',
        };
      }

      if (conflictRows[0]) {
        return {
          status: 'error',
          message: '所选 IP 下已存在同名角色 slug。',
        };
      }

      const nextId = recordId ?? crypto.randomUUID();

      if (recordId) {
        await db
          .update(characters)
          .set({
            ipId,
            slug,
            name,
            nameLocalized,
            description,
            avatarImageUrl,
            status,
            updatedAt: now,
          })
          .where(eq(characters.id, nextId));
      } else {
        await db.insert(characters).values({
          id: nextId,
          ipId,
          slug,
          name,
          nameLocalized,
          description,
          avatarImageUrl,
          status,
        });
      }

      revalidatePath('/admin');
      revalidatePath('/admin/catalog');
      revalidatePath('/search');
      revalidatePath('/');
      revalidatePath(`/ips/${ipRow.slug}`);

      if (existing) {
        revalidatePath(`/ips/${existing.ipSlug}/characters/${existing.slug}`);
      }

      revalidatePath(`/ips/${ipRow.slug}/characters/${slug}`);
      redirect(buildReturnPath(parsed.data, nextId));
    }

    const {
      recordId,
      ipId,
      slug,
      name,
      description,
      coverImageUrl,
      seriesType,
      releaseDate,
      status,
    } = parsed.data;
    const [ipRows, existingRows, conflictRows] = await Promise.all([
      db
        .select({
          id: ips.id,
          slug: ips.slug,
        })
        .from(ips)
        .where(eq(ips.id, ipId))
        .limit(1),
      recordId
        ? db
            .select({
              id: series.id,
              slug: series.slug,
              ipSlug: ips.slug,
            })
            .from(series)
            .innerJoin(ips, eq(series.ipId, ips.id))
            .where(eq(series.id, recordId))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({
          id: series.id,
        })
        .from(series)
        .where(
          and(
            eq(series.ipId, ipId),
            eq(series.slug, slug),
            recordId ? ne(series.id, recordId) : undefined,
          ),
        )
        .limit(1),
    ]);

    const ipRow = ipRows[0];
    const existing = existingRows[0] ?? null;

    if (!ipRow) {
      return {
        status: 'error',
        message: '所选 IP 已不存在。',
      };
    }

    if (recordId && !existing) {
      return {
        status: 'error',
        message: '未找到正在编辑的系列记录。',
      };
    }

    if (conflictRows[0]) {
      return {
        status: 'error',
        message: '所选 IP 下已存在同名系列 slug。',
      };
    }

    const nextId = recordId ?? crypto.randomUUID();

    if (recordId) {
      await db
        .update(series)
        .set({
          ipId,
          slug,
          name,
          description,
          coverImageUrl,
          seriesType,
          releaseDate,
          status,
          updatedAt: now,
        })
        .where(eq(series.id, nextId));
    } else {
      await db.insert(series).values({
        id: nextId,
        ipId,
        slug,
        name,
        description,
        coverImageUrl,
        seriesType,
        releaseDate,
        status,
      });
    }

    revalidatePath('/admin');
    revalidatePath('/admin/catalog');
    revalidatePath('/search');
    revalidatePath('/');
    revalidatePath(`/ips/${ipRow.slug}`);

    if (existing) {
      revalidatePath(`/ips/${existing.ipSlug}/series/${existing.slug}`);
    }

    revalidatePath(`/ips/${ipRow.slug}/series/${slug}`);
    redirect(buildReturnPath(parsed.data, nextId));
  } catch (error) {
    return mapDatabaseError(error);
  }
}
