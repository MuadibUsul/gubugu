'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  calculateGoodsRatingScore,
  createDefaultGoodsRatingValues,
  goodsRatingDimensionMeta,
  goodsRatingVerdictMeta,
  goodsRatingVerdictValues,
} from '@/lib/goods-rating';
import { initialSaveGoodsRatingActionState } from '@/server/community/action-state';
import type { GoodsRatingSummary } from '@/server/data';
import { saveGoodsRatingAction } from '@/server/community/actions';

type GoodsRatingComposerProps = {
  goodsId: string;
  goodsSlug: string;
  isAuthenticated: boolean;
  userLabel: string | null;
  userRating: GoodsRatingSummary['userRating'];
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? '保存中...' : '保存评分'}
    </button>
  );
}

type RatingDraftState = ReturnType<typeof createDefaultGoodsRatingValues>;

export function GoodsRatingComposer({
  goodsId,
  goodsSlug,
  isAuthenticated,
  userLabel,
  userRating,
}: GoodsRatingComposerProps) {
  const [state, formAction] = useActionState(
    saveGoodsRatingAction,
    initialSaveGoodsRatingActionState,
  );
  const nextPath = useMemo(() => `/goods/${goodsSlug}`, [goodsSlug]);
  const initialValues: RatingDraftState = userRating
    ? {
        artworkScore: userRating.artworkScore,
        craftsmanshipScore: userRating.craftsmanshipScore,
        valueScore: userRating.valueScore,
        rarityScore: userRating.rarityScore,
        satisfactionScore: userRating.satisfactionScore,
        worthBuying: userRating.worthBuying,
        overallTag: userRating.overallTag,
      }
    : createDefaultGoodsRatingValues();
  const [draft, setDraft] = useState<RatingDraftState>(initialValues);
  const previewScore = calculateGoodsRatingScore(draft);

  if (!isAuthenticated) {
    return (
      <div className="collection-panel p-5 sm:p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
              评分
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              给这个 SKU 打分
            </h2>
            <p className="text-muted-foreground text-sm leading-7">
              登录后才能保存多维评分。你的评分只会挂在这条商品记录上。
            </p>
          </div>

          <Button asChild>
            <Link
              href={`/login?next=${encodeURIComponent(`${nextPath}#community`)}`}
            >
              登录后评分
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
              评分
            </p>
            <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-xs">
              {userLabel ?? '已登录收藏者'}
            </span>
          </div>
          <h2 className="font-heading text-foreground text-4xl leading-none">
            多维评分
          </h2>
          <p className="text-muted-foreground text-sm leading-7">
            每个用户对每个 SKU 只保留一条评分记录。总分由五个维度自动计算，同时保留总评标签和“是否值得买”两个分析信号。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border-border/70 bg-background/78 rounded-[1.45rem] border px-4 py-4">
            <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
              预览总分
            </p>
            <p className="font-heading text-foreground mt-2 text-5xl leading-none">
              {previewScore}
            </p>
          </div>
          <div className="border-border/70 bg-background/78 rounded-[1.45rem] border px-4 py-4">
            <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
              值得买吗
            </p>
            <p className="font-heading text-foreground mt-2 text-5xl leading-none">
              {draft.worthBuying ? '是' : '否'}
            </p>
          </div>
          <div className="border-border/70 bg-background/78 rounded-[1.45rem] border px-4 py-4">
            <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
              总评
            </p>
            <p className="font-heading text-foreground mt-2 text-5xl leading-none">
              {goodsRatingVerdictMeta[draft.overallTag].label}
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-5">
          <input name="goodsId" type="hidden" value={goodsId} />
          <input name="nextPath" type="hidden" value={nextPath} />

          <div className="space-y-4">
            {goodsRatingDimensionMeta.map((dimension) => (
              <fieldset
                className="border-border/70 bg-background/74 rounded-[1.45rem] border px-4 py-4"
                key={dimension.key}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-xl">
                    <p className="text-foreground text-sm font-semibold">
                      {dimension.label}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      {dimension.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const inputId = `${dimension.key}-${score}`;

                      return (
                        <label
                          className="cursor-pointer"
                          htmlFor={inputId}
                          key={score}
                        >
                          <input
                            checked={draft[dimension.key] === score}
                            className="peer sr-only"
                            id={inputId}
                            name={dimension.key}
                            onChange={() =>
                              setDraft((current) => ({
                                ...current,
                                [dimension.key]: score,
                              }))
                            }
                            type="radio"
                            value={score}
                          />
                          <span className="border-border/70 bg-card/76 text-muted-foreground peer-checked:border-accent peer-checked:bg-accent/14 peer-checked:text-foreground inline-flex min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition">
                            {score}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </fieldset>
            ))}
          </div>

          <fieldset className="space-y-3">
            <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
              总评价标签
            </p>
            <div className="flex flex-wrap gap-2">
              {goodsRatingVerdictValues.map((verdict) => {
                const inputId = `overall-tag-${verdict}`;

                return (
                  <label
                    className="cursor-pointer"
                    htmlFor={inputId}
                    key={verdict}
                  >
                    <input
                      checked={draft.overallTag === verdict}
                      className="peer sr-only"
                      id={inputId}
                      name="overallTag"
                      onChange={() =>
                        setDraft((current) => ({
                          ...current,
                          overallTag: verdict,
                        }))
                      }
                      type="radio"
                      value={verdict}
                    />
                    <span className="border-border/70 bg-card/76 text-muted-foreground peer-checked:border-accent peer-checked:bg-accent/14 peer-checked:text-foreground inline-flex rounded-full border px-4 py-2 text-sm font-semibold transition">
                      {goodsRatingVerdictMeta[verdict].label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="border-border/70 bg-background/74 flex items-start gap-3 rounded-[1.4rem] border px-4 py-4">
            <input
              checked={draft.worthBuying}
              className="border-border mt-1 size-4 rounded"
              name="worthBuying"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  worthBuying: event.target.checked,
                }))
              }
              type="checkbox"
              value="1"
            />
            <div>
              <p className="text-foreground text-sm font-semibold">
                是否值得买
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                这会作为独立分析信号保留下来，而不是事后再从数值评分里反推。
              </p>
            </div>
          </label>

          {state.status === 'error' && state.message ? (
            <div className="border-destructive/30 bg-destructive/8 text-muted-foreground rounded-[1.25rem] border px-4 py-3 text-sm leading-7">
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <SubmitButton />
            {userRating ? (
              <span className="border-border/70 bg-background/76 text-muted-foreground inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm">
                上次保存：{userRating.overallScore.toFixed(2)}
              </span>
            ) : (
              <span className="border-border/70 bg-background/76 text-muted-foreground inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm">
                这是这个 SKU 的第一条评分
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
