'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { slugifyText } from '@/lib/slug';
import { initialSaveAdminGoodsActionState } from '@/server/admin/goods/action-state';
import { saveAdminGoodsAction } from '@/server/admin/goods/actions';
import type {
  AdminGoodsEditableRecord,
  AdminGoodsSeriesOption,
  AdminGoodsTagLibraryItem,
} from '@/server/data/admin-goods';

type AdminGoodsEditorFormProps = {
  editorMode: 'create' | 'edit';
  filters: {
    query?: string;
    status?: 'draft' | 'published' | 'archived';
    seriesId?: string;
  };
  initialGoods: AdminGoodsEditableRecord | null;
  seriesOptions: AdminGoodsSeriesOption[];
  tagLibrary: AdminGoodsTagLibraryItem[];
};

type TagDraft = {
  name: string;
  slug: string;
};

type ImageDraft = {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: string;
};

const inputClassName =
  'h-11 w-full rounded-[1rem] border border-border/70 bg-background/82 px-4 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60';
const textareaClassName =
  'min-h-[120px] w-full rounded-[1rem] border border-border/70 bg-background/82 px-4 py-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60';
const labelClassName =
  'block text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground';

function createEmptyTagRow(): TagDraft {
  return {
    name: '',
    slug: '',
  };
}

function createEmptyImageRow(index: number): ImageDraft {
  return {
    id: '',
    imageUrl: '',
    altText: '',
    sortOrder: String(index),
  };
}

function getInitialTagRows(initialGoods: AdminGoodsEditableRecord | null) {
  if (!initialGoods || initialGoods.tags.length === 0) {
    return [createEmptyTagRow()];
  }

  return initialGoods.tags.map((tag) => ({
    name: tag.name,
    slug: tag.slug,
  }));
}

function getInitialImageRows(initialGoods: AdminGoodsEditableRecord | null) {
  if (!initialGoods || initialGoods.images.length === 0) {
    return [createEmptyImageRow(0)];
  }

  return initialGoods.images.map((image) => ({
    id: image.id,
    imageUrl: image.imageUrl,
    altText: image.altText ?? '',
    sortOrder: String(image.sortOrder),
  }));
}

function getInitialPrimaryIndex(initialGoods: AdminGoodsEditableRecord | null) {
  const index =
    initialGoods?.images.findIndex((image) => image.isPrimary) ?? -1;

  return index >= 0 ? index : 0;
}

function formatDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : '';
}

function formatMetadataValue(value: Record<string, unknown> | null) {
  return value ? JSON.stringify(value, null, 2) : '';
}

function SaveButton({
  disabled,
  editorMode,
}: {
  disabled: boolean;
  editorMode: 'create' | 'edit';
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} type="submit">
      {pending
        ? editorMode === 'create'
          ? '正在保存新商品...'
          : '正在保存修改...'
        : editorMode === 'create'
          ? '创建商品记录'
          : '保存商品修改'}
    </Button>
  );
}

export function AdminGoodsEditorForm({
  editorMode,
  filters,
  initialGoods,
  seriesOptions,
  tagLibrary,
}: AdminGoodsEditorFormProps) {
  const [state, formAction] = useActionState(
    saveAdminGoodsAction,
    initialSaveAdminGoodsActionState,
  );
  const [name, setName] = useState(initialGoods?.name ?? '');
  const [slug, setSlug] = useState(initialGoods?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(
    Boolean(initialGoods?.slug ?? ''),
  );
  const [metadataText, setMetadataText] = useState(
    formatMetadataValue(initialGoods?.metadata ?? null),
  );
  const [tagRows, setTagRows] = useState<TagDraft[]>(
    getInitialTagRows(initialGoods),
  );
  const [imageRows, setImageRows] = useState<ImageDraft[]>(
    getInitialImageRows(initialGoods),
  );
  const [primaryImageIndex, setPrimaryImageIndex] = useState(
    getInitialPrimaryIndex(initialGoods),
  );
  const isLocked = seriesOptions.length === 0;

  function handleNameChange(nextValue: string) {
    setName(nextValue);

    if (!slugTouched) {
      setSlug(slugifyText(nextValue));
    }
  }

  function handleSlugAutofill() {
    setSlug(slugifyText(name));
    setSlugTouched(true);
  }

  function updateTagRow(index: number, key: keyof TagDraft, value: string) {
    setTagRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    );
  }

  function addTagRow() {
    setTagRows((current) => [...current, createEmptyTagRow()]);
  }

  function removeTagRow(index: number) {
    setTagRows((current) => {
      if (current.length === 1) {
        return [createEmptyTagRow()];
      }

      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function updateImageRow(index: number, key: keyof ImageDraft, value: string) {
    setImageRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    );
  }

  function addImageRow() {
    setImageRows((current) => [
      ...current,
      createEmptyImageRow(current.length),
    ]);
  }

  function removeImageRow(index: number) {
    if (imageRows.length === 1) {
      setImageRows([createEmptyImageRow(0)]);
      setPrimaryImageIndex(0);
      return;
    }

    setImageRows((current) =>
      current.filter((_, rowIndex) => rowIndex !== index),
    );
    setPrimaryImageIndex((current) => {
      if (current === index) {
        return 0;
      }

      return current > index ? current - 1 : current;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input name="goodsId" type="hidden" value={initialGoods?.id ?? ''} />
      <input name="returnQuery" type="hidden" value={filters.query ?? ''} />
      <input name="returnStatus" type="hidden" value={filters.status ?? ''} />
      <input
        name="returnSeriesId"
        type="hidden"
        value={filters.seriesId ?? ''}
      />

      <div className="border-border/70 bg-background/78 flex flex-wrap items-start justify-between gap-4 rounded-[1.5rem] border px-5 py-5">
        <div className="space-y-2">
          <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
            {editorMode === 'create' ? '新建商品条目' : '编辑商品条目'}
          </p>
          <h2 className="font-heading text-foreground text-4xl leading-none">
            {editorMode === 'create'
              ? '创建 SKU 记录'
              : (initialGoods?.name ?? '商品编辑器')}
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-7">
            商品信息、标签和官图会一次性保存，保证录入工作始终围绕 SKU
            级资料完整度展开。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {editorMode === 'edit' && initialGoods ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/goods/${initialGoods.slug}`}>打开公开页</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {state.status === 'error' && state.message ? (
        <div className="border-destructive/30 bg-destructive/8 text-foreground rounded-[1.25rem] border px-4 py-3 text-sm leading-7">
          {state.message}
        </div>
      ) : null}

      {isLocked ? (
        <div className="border-border/70 bg-background/78 text-muted-foreground rounded-[1.25rem] border px-4 py-4 text-sm leading-7">
          当前还没有可用系列记录。由于现有数据结构要求每个商品都必须归属一个系列，
          因此暂时无法创建商品。
        </div>
      ) : null}

      <fieldset className="space-y-6" disabled={isLocked}>
        <section className="collection-panel p-5 sm:p-6">
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-series">
                  系列
                </label>
                <select
                  className={inputClassName}
                  defaultValue={
                    initialGoods?.seriesId ??
                    filters.seriesId ??
                    seriesOptions[0]?.id ??
                    ''
                  }
                  id="admin-goods-series"
                  name="seriesId"
                >
                  {seriesOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.ip.name} / {option.name} / {option.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-status">
                  状态
                </label>
                <select
                  className={inputClassName}
                  defaultValue={initialGoods?.status ?? 'draft'}
                  id="admin-goods-status"
                  name="status"
                >
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="archived">已归档</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-sku">
                  SKU 编号
                </label>
                <input
                  className={inputClassName}
                  defaultValue={initialGoods?.skuCode ?? ''}
                  id="admin-goods-sku"
                  name="skuCode"
                  placeholder="NR-SBF-2026-001"
                  type="text"
                />
              </div>

              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-type">
                  商品类型
                </label>
                <input
                  className={inputClassName}
                  defaultValue={initialGoods?.goodsType ?? ''}
                  id="admin-goods-type"
                  name="goodsType"
                  placeholder="acrylic-stand"
                  type="text"
                />
              </div>

              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-name">
                  名称
                </label>
                <input
                  className={inputClassName}
                  id="admin-goods-name"
                  name="name"
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="如：葵月城 亚克力立牌·春日 Bloom Ver."
                  type="text"
                  value={name}
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-slug">
                  Slug
                </label>
                <input
                  className={inputClassName}
                  id="admin-goods-slug"
                  name="slug"
                  onChange={(event) => {
                    setSlug(event.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="aoi-tsukishiro-spring-bloom-acrylic-stand"
                  type="text"
                  value={slug}
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleSlugAutofill}
                  type="button"
                  variant="outline"
                >
                  由名称生成
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-3">
                <label
                  className={labelClassName}
                  htmlFor="admin-goods-material"
                >
                  材质
                </label>
                <input
                  className={inputClassName}
                  defaultValue={initialGoods?.material ?? ''}
                  id="admin-goods-material"
                  name="material"
                  placeholder="如：亚克力"
                  type="text"
                />
              </div>

              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-size">
                  尺寸标注
                </label>
                <input
                  className={inputClassName}
                  defaultValue={initialGoods?.sizeLabel ?? ''}
                  id="admin-goods-size"
                  name="sizeLabel"
                  placeholder="H160mm"
                  type="text"
                />
              </div>

              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-edition">
                  版本
                </label>
                <input
                  className={inputClassName}
                  defaultValue={initialGoods?.edition ?? ''}
                  id="admin-goods-edition"
                  name="edition"
                  placeholder="如：会场限定"
                  type="text"
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-3">
                <label
                  className={labelClassName}
                  htmlFor="admin-goods-release-date"
                >
                  发售日期
                </label>
                <input
                  className={inputClassName}
                  defaultValue={formatDateInputValue(
                    initialGoods?.releaseDate ?? null,
                  )}
                  id="admin-goods-release-date"
                  name="releaseDate"
                  type="date"
                />
              </div>

              <div className="space-y-3">
                <label className={labelClassName} htmlFor="admin-goods-msrp">
                  MSRP
                </label>
                <input
                  className={inputClassName}
                  defaultValue={initialGoods?.msrpAmount ?? ''}
                  id="admin-goods-msrp"
                  name="msrpAmount"
                  placeholder="89.00"
                  type="text"
                />
              </div>

              <div className="space-y-3">
                <label
                  className={labelClassName}
                  htmlFor="admin-goods-currency-code"
                >
                  币种
                </label>
                <input
                  className={inputClassName}
                  defaultValue={initialGoods?.currencyCode ?? ''}
                  id="admin-goods-currency-code"
                  maxLength={3}
                  name="currencyCode"
                  placeholder="CNY"
                  type="text"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label
                className={labelClassName}
                htmlFor="admin-goods-description"
              >
                描述
              </label>
              <textarea
                className={textareaClassName}
                defaultValue={initialGoods?.description ?? ''}
                id="admin-goods-description"
                name="description"
                placeholder="聚焦可识别特征、包装信息与可收录的图鉴细节。"
              />
            </div>

            <div className="space-y-3">
              <label className={labelClassName} htmlFor="admin-goods-metadata">
                元数据 JSON
              </label>
              <textarea
                className={`${textareaClassName} min-h-[180px] font-mono text-xs leading-6`}
                id="admin-goods-metadata"
                name="metadataText"
                onChange={(event) => setMetadataText(event.target.value)}
                placeholder='{"backdrop":"sakura stage"}'
                value={metadataText}
              />
              <p className="text-muted-foreground text-sm leading-6">
                这里必须是 JSON
                对象。如果当前条目还不需要扩展结构字段，可以留空。
              </p>
            </div>
          </div>
        </section>

        <section className="collection-panel p-5 sm:p-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
                  标签管理
                </p>
                <h3 className="font-heading text-foreground text-3xl leading-none">
                  为浏览和搜索分配标签
                </h3>
                <p className="text-muted-foreground max-w-3xl text-sm leading-7">
                  已有标签会按 slug 或名称复用。这里不会全局重命名标签，
                  修改后的值只会创建新标签或重新绑定当前商品。
                </p>
              </div>

              <Button onClick={addTagRow} type="button" variant="outline">
                新增标签行
              </Button>
            </div>

            <datalist id="admin-goods-tag-name-list">
              {tagLibrary.map((tag) => (
                <option
                  key={`tag-name-${tag.id}`}
                  label={`${tag.slug} / used ${tag.usageCount}`}
                  value={tag.name}
                />
              ))}
            </datalist>
            <datalist id="admin-goods-tag-slug-list">
              {tagLibrary.map((tag) => (
                <option
                  key={`tag-slug-${tag.id}`}
                  label={`${tag.name} / used ${tag.usageCount}`}
                  value={tag.slug}
                />
              ))}
            </datalist>

            <div className="space-y-3">
              {tagRows.map((row, index) => (
                <div
                  className="border-border/70 bg-background/76 grid gap-3 rounded-[1.25rem] border px-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  key={`${editorMode}-tag-${index}`}
                >
                  <div className="space-y-2">
                    <label
                      className={labelClassName}
                      htmlFor={`tag-name-${index}`}
                    >
                      标签名称
                    </label>
                    <input
                      className={inputClassName}
                      id={`tag-name-${index}`}
                      list="admin-goods-tag-name-list"
                      name="tagName"
                      onChange={(event) =>
                        updateTagRow(index, 'name', event.target.value)
                      }
                      placeholder="如：春日 Bloom"
                      type="text"
                      value={row.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className={labelClassName}
                      htmlFor={`tag-slug-${index}`}
                    >
                      标签 Slug
                    </label>
                    <input
                      className={inputClassName}
                      id={`tag-slug-${index}`}
                      list="admin-goods-tag-slug-list"
                      name="tagSlug"
                      onChange={(event) =>
                        updateTagRow(index, 'slug', event.target.value)
                      }
                      placeholder="spring-bloom"
                      type="text"
                      value={row.slug}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={() => removeTagRow(index)}
                      type="button"
                      variant="ghost"
                    >
                      移除
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-border/70 bg-background/76 rounded-[1.25rem] border px-4 py-4">
              <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.24em] uppercase">
                高频复用标签
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tagLibrary.length > 0 ? (
                  tagLibrary.slice(0, 20).map((tag) => (
                    <span
                      className="border-border/70 bg-card/76 text-foreground rounded-full border px-3 py-1 text-xs"
                      key={tag.id}
                    >
                      {tag.name} / {tag.slug} / {tag.usageCount}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    暂无标签记录。
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="collection-panel p-5 sm:p-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
                  图片管理
                </p>
                <h3 className="font-heading text-foreground text-3xl leading-none">
                  维护结构化官图集合
                </h3>
                <p className="text-muted-foreground max-w-3xl text-sm leading-7">
                  会尽量保留已有图片记录 ID，方便后续相似图索引继续稳定绑定到
                  `goods_images` 记录。
                </p>
              </div>

              <Button onClick={addImageRow} type="button" variant="outline">
                新增图片行
              </Button>
            </div>

            <div className="space-y-4">
              {imageRows.map((row, index) => (
                <div
                  className="border-border/70 bg-background/76 grid gap-4 rounded-[1.4rem] border px-4 py-4 2xl:grid-cols-[112px_minmax(0,1.2fr)_160px_minmax(0,0.8fr)_auto]"
                  key={`${editorMode}-image-${row.id || index}`}
                >
                  <input name="imageId" type="hidden" value={row.id} />

                  <div className="space-y-2">
                    <label
                      className={labelClassName}
                      htmlFor={`image-primary-${index}`}
                    >
                      主图
                    </label>
                    <label className="border-border/70 bg-card/78 text-muted-foreground flex h-24 flex-col items-center justify-center rounded-[1rem] border text-center text-xs">
                      <input
                        checked={primaryImageIndex === index}
                        className="mb-2"
                        id={`image-primary-${index}`}
                        name="primaryImageIndex"
                        onChange={() => setPrimaryImageIndex(index)}
                        type="radio"
                        value={index}
                      />
                      设为主图
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label
                        className={labelClassName}
                        htmlFor={`image-url-${index}`}
                      >
                        图片地址
                      </label>
                      <input
                        className={inputClassName}
                        id={`image-url-${index}`}
                        name="imageUrl"
                        onChange={(event) =>
                          updateImageRow(index, 'imageUrl', event.target.value)
                        }
                        placeholder="https://cdn.example.com/goods/front.webp"
                        type="text"
                        value={row.imageUrl}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        className={labelClassName}
                        htmlFor={`image-alt-${index}`}
                      >
                        替代文本
                      </label>
                      <input
                        className={inputClassName}
                        id={`image-alt-${index}`}
                        name="imageAltText"
                        onChange={(event) =>
                          updateImageRow(index, 'altText', event.target.value)
                        }
                        placeholder="如：商品正面官图"
                        type="text"
                        value={row.altText}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)] 2xl:grid-cols-1">
                    <div className="space-y-2">
                      <label
                        className={labelClassName}
                        htmlFor={`image-sort-${index}`}
                      >
                        排序值
                      </label>
                      <input
                        className={inputClassName}
                        id={`image-sort-${index}`}
                        inputMode="numeric"
                        name="imageSortOrder"
                        onChange={(event) =>
                          updateImageRow(index, 'sortOrder', event.target.value)
                        }
                        type="text"
                        value={row.sortOrder}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className={labelClassName}>预览</p>
                      <div
                        className="border-border/70 bg-card/78 h-24 rounded-[1rem] border bg-cover bg-center"
                        style={
                          row.imageUrl
                            ? {
                                backgroundImage: `url(${row.imageUrl})`,
                              }
                            : undefined
                        }
                      >
                        {!row.imageUrl ? (
                          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                            暂无预览
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={() => removeImageRow(index)}
                      type="button"
                      variant="ghost"
                    >
                      移除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-border/70 bg-background/78 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border px-5 py-4">
          <p className="text-muted-foreground text-sm leading-7">
            空的标签行或图片行会被自动忽略。如果没有显式指定主图，
            第一张有效图片会自动成为主图。
          </p>
          <SaveButton disabled={isLocked} editorMode={editorMode} />
        </div>
      </fieldset>
    </form>
  );
}
