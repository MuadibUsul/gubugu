'use server';

import { and, eq, inArray, ne, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { goods, goodsImages, goodsTags, series, tags } from '@/drizzle/schema';
import { slugifyText } from '@/lib/slug';
import type { SaveAdminGoodsActionState } from '@/server/admin/goods/action-state';
import { requireAdminAccess } from '@/server/auth/admin';
import { getDb, type Database } from '@/server/db/client';

const entityStatusValues = ['draft', 'published', 'archived'] as const;

type GoodsAdminTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];

type NormalizedTagRow = {
  name: string;
  slug: string;
};

type NormalizedImageRow = {
  id?: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

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

const optionalAmountFieldSchema = optionalFormStringSchema
  .refine((value) => value.length === 0 || /^\d+(\.\d{1,2})?$/.test(value), {
    message: 'MSRP 必须是最多两位小数的非负数字。',
  })
  .transform((value) => (value.length > 0 ? value : null));

const optionalCurrencyCodeFieldSchema = optionalFormStringSchema
  .transform((value) => value.toUpperCase())
  .refine((value) => value.length === 0 || /^[A-Z]{3}$/.test(value), {
    message: '币种代码必须是 3 位 ISO 代码。',
  })
  .transform((value) => (value.length > 0 ? value : null));

const saveAdminGoodsInputSchema = z
  .object({
    goodsId: optionalUuidFormSchema,
    returnQuery: optionalFormStringSchema
      .refine((value) => value.length <= 100, {
        message: '返回查询词过长。',
      })
      .transform((value) => (value.length > 0 ? value : undefined)),
    returnStatus: optionalStatusFormSchema,
    returnSeriesId: optionalUuidFormSchema,
    seriesId: z.string().uuid('必须选择系列。'),
    skuCode: requiredTextFieldSchema('SKU 编号', 128),
    slug: requiredTextFieldSchema('Slug', 160)
      .transform((value) => slugifyText(value))
      .refine((value) => value.length > 0, {
        message: 'Slug 必须包含字母或数字。',
      })
      .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
        message: 'Slug 只能包含小写字母、数字和连字符。',
      }),
    name: requiredTextFieldSchema('名称', 255),
    description: optionalTextFieldSchema(4000),
    goodsType: requiredTextFieldSchema('商品类型', 64),
    material: optionalTextFieldSchema(128),
    sizeLabel: optionalTextFieldSchema(128),
    edition: optionalTextFieldSchema(128),
    releaseDate: optionalDateFieldSchema,
    msrpAmount: optionalAmountFieldSchema,
    currencyCode: optionalCurrencyCodeFieldSchema,
    metadataText: optionalTextFieldSchema(12000),
    status: z.enum(entityStatusValues),
  })
  .superRefine((value, ctx) => {
    if (value.msrpAmount && !value.currencyCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '填写 MSRP 时必须同时填写币种代码。',
        path: ['currencyCode'],
      });
    }
  });

const metadataSchema = z.record(z.string(), z.unknown());

const tagRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '必须填写标签名称。')
    .max(128, '标签名称请控制在 128 个字符以内。'),
  slug: z
    .string()
    .trim()
    .min(1, '必须填写标签 slug。')
    .max(128, '标签 slug 请控制在 128 个字符以内。')
    .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
      message: '标签 slug 只能包含小写字母、数字和连字符。',
    }),
});

const imageRowSchema = z.object({
  id: optionalUuidFormSchema,
  imageUrl: z.string().trim().url('图片地址必须是完整 URL。'),
  altText: optionalTextFieldSchema(255),
  sortOrder: z.number().int().min(0, '排序值必须大于或等于 0。'),
});

function getStringEntries(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === 'string' ? value : ''));
}

function parseMetadataValue(metadataText: string | null) {
  if (!metadataText) {
    return {
      success: true as const,
      data: null,
    };
  }

  try {
    const parsed = JSON.parse(metadataText);
    const record = metadataSchema.parse(parsed);

    return {
      success: true as const,
      data: record,
    };
  } catch {
    return {
      success: false as const,
      message: '元数据必须是合法的 JSON 对象。',
    };
  }
}

function normalizeTagRows(formData: FormData) {
  const rawNames = getStringEntries(formData, 'tagName');
  const rawSlugs = getStringEntries(formData, 'tagSlug');
  const rowCount = Math.max(rawNames.length, rawSlugs.length);
  const normalizedRows: NormalizedTagRow[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const rawName = rawNames[index]?.trim() ?? '';
    const rawSlug = rawSlugs[index]?.trim() ?? '';

    if (!rawName && !rawSlug) {
      continue;
    }

    const normalizedSlug = slugifyText(rawSlug || rawName);

    if (!normalizedSlug) {
      return {
        success: false as const,
        message: `第 ${index + 1} 行标签缺少 slug。非拉丁文字请手动填写。`,
      };
    }

    const parsed = tagRowSchema.safeParse({
      name: rawName,
      slug: normalizedSlug,
    });

    if (!parsed.success) {
      return {
        success: false as const,
        message:
          parsed.error.issues[0]?.message ?? `第 ${index + 1} 行标签无效。`,
      };
    }

    normalizedRows.push(parsed.data);
  }

  return {
    success: true as const,
    rows: Array.from(
      new Map(normalizedRows.map((row) => [row.slug, row])).values(),
    ),
  };
}

function normalizeImageRows(formData: FormData) {
  const rawIds = getStringEntries(formData, 'imageId');
  const rawUrls = getStringEntries(formData, 'imageUrl');
  const rawAltTexts = getStringEntries(formData, 'imageAltText');
  const rawSortOrders = getStringEntries(formData, 'imageSortOrder');
  const rowCount = Math.max(
    rawIds.length,
    rawUrls.length,
    rawAltTexts.length,
    rawSortOrders.length,
  );
  const primaryIndexRaw = formData.get('primaryImageIndex');
  const parsedPrimaryIndex =
    typeof primaryIndexRaw === 'string' && primaryIndexRaw.trim().length > 0
      ? Number.parseInt(primaryIndexRaw, 10)
      : null;
  const primaryIndex =
    parsedPrimaryIndex !== null && Number.isInteger(parsedPrimaryIndex)
      ? parsedPrimaryIndex
      : null;
  const rows: Array<NormalizedImageRow & { inputIndex: number }> = [];

  for (let index = 0; index < rowCount; index += 1) {
    const id = rawIds[index]?.trim() ?? '';
    const imageUrl = rawUrls[index]?.trim() ?? '';
    const altText = rawAltTexts[index]?.trim() ?? '';
    const sortOrderValue = rawSortOrders[index]?.trim() ?? '';

    if (!id && !imageUrl && !altText && !sortOrderValue) {
      continue;
    }

    const sortOrder =
      sortOrderValue.length > 0 ? Number.parseInt(sortOrderValue, 10) : index;

    if (!imageUrl) {
      return {
        success: false as const,
        message: `第 ${index + 1} 行图片缺少地址。`,
      };
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return {
        success: false as const,
        message: `第 ${index + 1} 行图片排序值无效。`,
      };
    }

    const parsed = imageRowSchema.safeParse({
      id: id || undefined,
      imageUrl,
      altText: altText || null,
      sortOrder,
    });

    if (!parsed.success) {
      return {
        success: false as const,
        message:
          parsed.error.issues[0]?.message ?? `第 ${index + 1} 行图片无效。`,
      };
    }

    rows.push({
      ...parsed.data,
      inputIndex: index,
      isPrimary: primaryIndex === index,
    });
  }

  const duplicateImageId = findDuplicateValue(
    rows
      .map((row) => row.id)
      .filter((value): value is string => Boolean(value)),
  );

  if (duplicateImageId) {
    return {
      success: false as const,
      message: '同一图片记录被重复提交了。',
    };
  }

  const normalizedRows = rows
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.inputIndex - right.inputIndex,
    )
    .map((row, index) => ({
      id: row.id,
      imageUrl: row.imageUrl,
      altText: row.altText,
      sortOrder: index,
      isPrimary: row.isPrimary,
    }));

  if (
    normalizedRows.length > 0 &&
    !normalizedRows.some((row) => row.isPrimary)
  ) {
    normalizedRows[0] = {
      ...normalizedRows[0],
      isPrimary: true,
    };
  }

  return {
    success: true as const,
    rows: normalizedRows,
  };
}

function findDuplicateValue(values: string[]) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }

    seen.add(value);
  }

  return null;
}

function buildReturnPath(
  input: z.output<typeof saveAdminGoodsInputSchema>,
  goodsId: string,
) {
  const params = new URLSearchParams();

  if (input.returnQuery) {
    params.set('query', input.returnQuery);
  }

  if (input.returnStatus) {
    params.set('status', input.returnStatus);
  }

  if (input.returnSeriesId) {
    params.set('seriesId', input.returnSeriesId);
  }

  params.set('goodsId', goodsId);

  return `/admin/goods?${params.toString()}`;
}

async function resolveTagIds(
  tx: GoodsAdminTransaction,
  normalizedTags: NormalizedTagRow[],
) {
  if (normalizedTags.length === 0) {
    return [] as string[];
  }

  const existingTagRows = await tx
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(tags)
    .where(
      or(
        inArray(
          tags.slug,
          normalizedTags.map((row) => row.slug),
        ),
        inArray(
          tags.name,
          normalizedTags.map((row) => row.name),
        ),
      ),
    );

  const tagBySlug = new Map(existingTagRows.map((row) => [row.slug, row]));
  const tagByName = new Map(existingTagRows.map((row) => [row.name, row]));
  const tagIds: string[] = [];

  for (const row of normalizedTags) {
    const existingBySlug = tagBySlug.get(row.slug);
    const existingByName = tagByName.get(row.name);

    if (existingBySlug) {
      tagIds.push(existingBySlug.id);
      continue;
    }

    if (existingByName) {
      tagIds.push(existingByName.id);
      continue;
    }

    const createdTagId = crypto.randomUUID();

    await tx.insert(tags).values({
      id: createdTagId,
      name: row.name,
      slug: row.slug,
    });

    tagIds.push(createdTagId);
  }

  return Array.from(new Set(tagIds));
}

async function syncGoodsImages(
  tx: GoodsAdminTransaction,
  goodsId: string,
  images: NormalizedImageRow[],
  now: Date,
) {
  const existingImageRows = await tx
    .select({
      id: goodsImages.id,
    })
    .from(goodsImages)
    .where(eq(goodsImages.goodsId, goodsId));

  const existingIds = new Set(existingImageRows.map((row) => row.id));

  for (const image of images) {
    if (image.id && !existingIds.has(image.id)) {
      throw new Error(
        '提交的图片行不属于当前商品记录。',
      );
    }
  }

  if (images.length === 0) {
    await tx.delete(goodsImages).where(eq(goodsImages.goodsId, goodsId));
    return;
  }

  const nextImageIds = new Set(
    images
      .map((row) => row.id)
      .filter((value): value is string => Boolean(value)),
  );
  const deletedIds = existingImageRows
    .map((row) => row.id)
    .filter((id) => !nextImageIds.has(id));

  if (deletedIds.length > 0) {
    await tx
      .delete(goodsImages)
      .where(
        and(
          eq(goodsImages.goodsId, goodsId),
          inArray(goodsImages.id, deletedIds),
        ),
      );
  }

  for (const image of images) {
    if (image.id) {
      await tx
        .update(goodsImages)
        .set({
          imageUrl: image.imageUrl,
          altText: image.altText,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
          updatedAt: now,
        })
        .where(
          and(eq(goodsImages.goodsId, goodsId), eq(goodsImages.id, image.id)),
        );

      continue;
    }

    await tx.insert(goodsImages).values({
      id: crypto.randomUUID(),
      goodsId,
      imageUrl: image.imageUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    });
  }
}

function mapDatabaseError(error: unknown): SaveAdminGoodsActionState {
  if (error instanceof Error) {
    if (error.message.includes('goods_sku_code_unique')) {
      return {
        status: 'error',
        message: 'SKU 编号已存在，请使用唯一值。',
      };
    }

    if (error.message.includes('goods_slug_unique')) {
      return {
        status: 'error',
        message: 'Slug 已存在，请使用唯一值。',
      };
    }

    if (error.message.includes('tags_slug_unique')) {
      return {
        status: 'error',
        message: '标签 slug 已被其他记录占用。',
      };
    }

    if (error.message.includes('tags_name_unique')) {
      return {
        status: 'error',
        message: '标签名称已被其他记录占用。',
      };
    }
  }

  return {
    status: 'error',
    message: '保存商品数据失败，请检查提交字段后重试。',
  };
}

export async function saveAdminGoodsAction(
  _previousState: SaveAdminGoodsActionState,
  formData: FormData,
): Promise<SaveAdminGoodsActionState> {
  await requireAdminAccess('/admin/goods');

  const parsed = saveAdminGoodsInputSchema.safeParse({
    goodsId: formData.get('goodsId'),
    returnQuery: formData.get('returnQuery'),
    returnStatus: formData.get('returnStatus'),
    returnSeriesId: formData.get('returnSeriesId'),
    seriesId: formData.get('seriesId'),
    skuCode: formData.get('skuCode'),
    slug: formData.get('slug'),
    name: formData.get('name'),
    description: formData.get('description'),
    goodsType: formData.get('goodsType'),
    material: formData.get('material'),
    sizeLabel: formData.get('sizeLabel'),
    edition: formData.get('edition'),
    releaseDate: formData.get('releaseDate'),
    msrpAmount: formData.get('msrpAmount'),
    currencyCode: formData.get('currencyCode'),
    metadataText: formData.get('metadataText'),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message:
        parsed.error.issues[0]?.message ?? '商品管理请求参数无效。',
    };
  }

  const metadataResult = parseMetadataValue(parsed.data.metadataText);

  if (!metadataResult.success) {
    return {
      status: 'error',
      message: metadataResult.message,
    };
  }

  const tagRowsResult = normalizeTagRows(formData);

  if (!tagRowsResult.success) {
    return {
      status: 'error',
      message: tagRowsResult.message,
    };
  }

  const imageRowsResult = normalizeImageRows(formData);

  if (!imageRowsResult.success) {
    return {
      status: 'error',
      message: imageRowsResult.message,
    };
  }

  let db: Database;

  try {
    db = getDb();
  } catch {
    return {
      status: 'error',
      message:
        '管理商品前必须先配置 DATABASE_URL。',
    };
  }

  const [seriesRows, existingGoodsRows, conflictRows] = await Promise.all([
    db
      .select({
        id: series.id,
      })
      .from(series)
      .where(eq(series.id, parsed.data.seriesId))
      .limit(1),
    parsed.data.goodsId
      ? db
          .select({
            id: goods.id,
            slug: goods.slug,
          })
          .from(goods)
          .where(eq(goods.id, parsed.data.goodsId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        id: goods.id,
        skuCode: goods.skuCode,
        slug: goods.slug,
      })
      .from(goods)
      .where(
        and(
          or(
            eq(goods.skuCode, parsed.data.skuCode),
            eq(goods.slug, parsed.data.slug),
          ),
          parsed.data.goodsId ? ne(goods.id, parsed.data.goodsId) : undefined,
        ),
      ),
  ]);

  if (!seriesRows[0]) {
    return {
      status: 'error',
      message: '所选系列已不存在。',
    };
  }

  const existingGoods = existingGoodsRows[0] ?? null;

  if (parsed.data.goodsId && !existingGoods) {
    return {
      status: 'error',
      message: '未找到正在编辑的商品记录。',
    };
  }

  const skuConflict = conflictRows.find(
    (row) => row.skuCode === parsed.data.skuCode,
  );

  if (skuConflict) {
    return {
      status: 'error',
      message: 'SKU 编号已存在，请使用唯一值。',
    };
  }

  const slugConflict = conflictRows.find(
    (row) => row.slug === parsed.data.slug,
  );

  if (slugConflict) {
    return {
      status: 'error',
      message: 'Slug 已存在，请使用唯一值。',
    };
  }

  const now = new Date();
  const goodsId = parsed.data.goodsId ?? crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      if (parsed.data.goodsId) {
        await tx
          .update(goods)
          .set({
            seriesId: parsed.data.seriesId,
            skuCode: parsed.data.skuCode,
            slug: parsed.data.slug,
            name: parsed.data.name,
            description: parsed.data.description,
            goodsType: parsed.data.goodsType,
            material: parsed.data.material,
            sizeLabel: parsed.data.sizeLabel,
            edition: parsed.data.edition,
            releaseDate: parsed.data.releaseDate,
            msrpAmount: parsed.data.msrpAmount,
            currencyCode: parsed.data.currencyCode,
            metadata: metadataResult.data,
            status: parsed.data.status,
            updatedAt: now,
          })
          .where(eq(goods.id, goodsId));
      } else {
        await tx.insert(goods).values({
          id: goodsId,
          seriesId: parsed.data.seriesId,
          skuCode: parsed.data.skuCode,
          slug: parsed.data.slug,
          name: parsed.data.name,
          description: parsed.data.description,
          goodsType: parsed.data.goodsType,
          material: parsed.data.material,
          sizeLabel: parsed.data.sizeLabel,
          edition: parsed.data.edition,
          releaseDate: parsed.data.releaseDate,
          msrpAmount: parsed.data.msrpAmount,
          currencyCode: parsed.data.currencyCode,
          metadata: metadataResult.data,
          status: parsed.data.status,
        });
      }

      const tagIds = await resolveTagIds(tx, tagRowsResult.rows);

      await tx.delete(goodsTags).where(eq(goodsTags.goodsId, goodsId));

      if (tagIds.length > 0) {
        await tx.insert(goodsTags).values(
          tagIds.map((tagId) => ({
            goodsId,
            tagId,
          })),
        );
      }

      await syncGoodsImages(tx, goodsId, imageRowsResult.rows, now);
    });
  } catch (error) {
    return mapDatabaseError(error);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/goods');
  revalidatePath('/search');

  if (existingGoods?.slug) {
    revalidatePath(`/goods/${existingGoods.slug}`);
  }

  revalidatePath(`/goods/${parsed.data.slug}`);

  redirect(buildReturnPath(parsed.data, goodsId));
}
