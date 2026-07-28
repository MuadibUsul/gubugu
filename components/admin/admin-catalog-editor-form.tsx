'use client';

import { useActionState } from 'react';

import { saveAdminCatalogEntityAction } from '@/server/admin/catalog/actions';
import { initialSaveAdminCatalogEntityActionState } from '@/server/admin/catalog/action-state';
import type {
  AdminCatalogIpOption,
  AdminCatalogPageData,
  AdminCharacterEditableRecord,
  AdminIpEditableRecord,
  AdminSeriesEditableRecord,
} from '@/server/data/admin-catalog';

type AdminCatalogEditorFormProps = {
  entity: AdminCatalogPageData['entity'];
  editorMode: AdminCatalogPageData['editorMode'];
  filters: AdminCatalogPageData['filters'];
  ipOptions: AdminCatalogIpOption[];
  initialIp: AdminIpEditableRecord | null;
  initialCharacter: AdminCharacterEditableRecord | null;
  initialSeries: AdminSeriesEditableRecord | null;
};

const inputClassName =
  'border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 h-11 w-full rounded-[1rem] border px-4 text-sm outline-none focus-visible:ring-2';
const textareaClassName =
  'border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-32 w-full rounded-[1rem] border px-4 py-3 text-sm outline-none focus-visible:ring-2';
const labelClassName =
  'text-muted-foreground block text-[0.7rem] font-semibold tracking-[0.24em] uppercase';

function formatDateInputValue(value: Date | null) {
  if (!value) {
    return '';
  }

  return value.toISOString().slice(0, 10);
}

export function AdminCatalogEditorForm({
  entity,
  editorMode,
  filters,
  ipOptions,
  initialIp,
  initialCharacter,
  initialSeries,
}: AdminCatalogEditorFormProps) {
  const [state, formAction] = useActionState(
    saveAdminCatalogEntityAction,
    initialSaveAdminCatalogEntityActionState,
  );
  const initialRecord =
    entity === 'ip'
      ? initialIp
      : entity === 'character'
        ? initialCharacter
        : initialSeries;
  const heading =
    entity === 'ip'
      ? editorMode === 'create'
        ? '创建 IP'
        : '编辑 IP'
      : entity === 'character'
        ? editorMode === 'create'
          ? '创建角色'
          : '编辑角色'
        : editorMode === 'create'
          ? '创建系列'
          : '编辑系列';

  return (
    <section className="collection-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
            编辑器
          </p>
          <h2 className="font-heading text-foreground text-4xl leading-none">
            {heading}
          </h2>
          <p className="text-muted-foreground text-sm leading-7">
            保持图鉴核心记录清晰、可维护。这个表单只会写入当前实体，
            不会额外扩展 V1 之外的范围。
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <input name="entity" type="hidden" value={entity} />
          <input
            name="recordId"
            type="hidden"
            value={initialRecord?.id ?? ''}
          />
          <input name="returnQuery" type="hidden" value={filters.query ?? ''} />
          <input
            name="returnStatus"
            type="hidden"
            value={filters.status ?? ''}
          />
          <input name="returnIpId" type="hidden" value={filters.ipId ?? ''} />

          {entity !== 'ip' ? (
            <section className="space-y-3">
              <label className={labelClassName} htmlFor="admin-catalog-ip">
                IP
              </label>
              <select
                className={inputClassName}
                defaultValue={
                  entity === 'character'
                    ? (initialCharacter?.ipId ?? filters.ipId ?? '')
                    : (initialSeries?.ipId ?? filters.ipId ?? '')
                }
                id="admin-catalog-ip"
                name="ipId"
              >
                <option value="">请选择 IP</option>
                {ipOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.status})
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-3">
              <label className={labelClassName} htmlFor="admin-catalog-name">
                名称
              </label>
              <input
                className={inputClassName}
                defaultValue={initialRecord?.name ?? ''}
                id="admin-catalog-name"
                name="name"
                placeholder="请输入条目名称"
                type="text"
              />
            </section>

            <section className="space-y-3">
              <label className={labelClassName} htmlFor="admin-catalog-slug">
                Slug
              </label>
              <input
                className={inputClassName}
                defaultValue={initialRecord?.slug ?? ''}
                id="admin-catalog-slug"
                name="slug"
                placeholder="entry-slug"
                type="text"
              />
            </section>
          </div>

          {entity !== 'series' ? (
            <section className="space-y-3">
              <label
                className={labelClassName}
                htmlFor="admin-catalog-name-localized"
              >
                本地化名称
              </label>
              <input
                className={inputClassName}
                defaultValue={
                  entity === 'ip'
                    ? (initialIp?.nameLocalized ?? '')
                    : (initialCharacter?.nameLocalized ?? '')
                }
                id="admin-catalog-name-localized"
                name="nameLocalized"
                placeholder="可选：中文或其他本地化名称"
                type="text"
              />
            </section>
          ) : null}

          {entity === 'series' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="space-y-3">
                <label
                  className={labelClassName}
                  htmlFor="admin-catalog-series-type"
                >
                  系列类型
                </label>
                <input
                  className={inputClassName}
                  defaultValue={initialSeries?.seriesType ?? 'standard'}
                  id="admin-catalog-series-type"
                  name="seriesType"
                  placeholder="standard"
                  type="text"
                />
              </section>

              <section className="space-y-3">
                <label
                  className={labelClassName}
                  htmlFor="admin-catalog-release-date"
                >
                  发售日期
                </label>
                <input
                  className={inputClassName}
                  defaultValue={formatDateInputValue(
                    initialSeries?.releaseDate ?? null,
                  )}
                  id="admin-catalog-release-date"
                  name="releaseDate"
                  type="date"
                />
              </section>
            </div>
          ) : null}

          <section className="space-y-3">
            <label className={labelClassName} htmlFor="admin-catalog-image-url">
              {entity === 'character' ? '头像图片地址' : '封面图片地址'}
            </label>
            <input
              className={inputClassName}
              defaultValue={
                entity === 'ip'
                  ? (initialIp?.coverImageUrl ?? '')
                  : entity === 'character'
                    ? (initialCharacter?.avatarImageUrl ?? '')
                    : (initialSeries?.coverImageUrl ?? '')
              }
              id="admin-catalog-image-url"
              name={entity === 'character' ? 'avatarImageUrl' : 'coverImageUrl'}
              placeholder="https://cdn.example.com/entry.webp"
              type="url"
            />
          </section>

          <section className="space-y-3">
            <label
              className={labelClassName}
              htmlFor="admin-catalog-description"
            >
              描述
            </label>
            <textarea
              className={textareaClassName}
              defaultValue={initialRecord?.description ?? ''}
              id="admin-catalog-description"
              name="description"
              placeholder="聚焦稳定、可识别、适合图鉴长期维护的描述信息。"
            />
          </section>

          <section className="space-y-3">
            <label className={labelClassName} htmlFor="admin-catalog-status">
              状态
            </label>
            <select
              className={inputClassName}
              defaultValue={initialRecord?.status ?? 'draft'}
              id="admin-catalog-status"
              name="status"
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </section>

          {state.message ? (
            <div className="border-destructive/30 bg-destructive/8 rounded-[1.2rem] border px-4 py-3 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_78%,var(--background))]">
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
              type="submit"
            >
              {editorMode === 'create' ? '创建记录' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
