'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { initialCreateGoodsPostActionState } from '@/server/community/action-state';
import { createGoodsPostAction } from '@/server/community/actions';

type GoodsCommunityComposerProps = {
  goodsId: string;
  goodsSlug: string;
  hasPendingSubmission: boolean;
  isAuthenticated: boolean;
  userLabel: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? '提交中...' : '提交'}
    </button>
  );
}

export function GoodsCommunityComposer({
  goodsId,
  goodsSlug,
  hasPendingSubmission,
  isAuthenticated,
  userLabel,
}: GoodsCommunityComposerProps) {
  const [state, formAction] = useActionState(
    createGoodsPostAction,
    initialCreateGoodsPostActionState,
  );
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const nextPath = useMemo(() => `/goods/${goodsSlug}`, [goodsSlug]);

  if (!isAuthenticated) {
    return (
      <div className="collection-panel p-5 sm:p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              评论
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              登录后发布
            </h2>
          </div>

          <Button asChild>
            <Link
              href={`/login?next=${encodeURIComponent(`${nextPath}#community`)}`}
            >
              登录
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
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              评论
            </p>
            <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-xs">
              {userLabel ?? '已登录'}
            </span>
          </div>
          <h2 className="font-heading text-foreground text-4xl leading-none">
            留言与晒图
          </h2>
        </div>

        {hasPendingSubmission ? (
          <div className="border-border/70 bg-accent/12 text-foreground rounded-[var(--radius)] border px-4 py-4 text-sm">
            你有一条内容正在审核中。
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          <input name="goodsId" type="hidden" value={goodsId} />
          <input name="nextPath" type="hidden" value={nextPath} />

          <div className="space-y-3">
            <label
              className="text-muted-foreground block text-[0.68rem] font-semibold uppercase"
              htmlFor="goods-community-body"
            >
              内容
            </label>
            <textarea
              className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-32 w-full rounded-[var(--radius)] border px-4 py-4 text-sm leading-7 transition outline-none focus-visible:ring-2"
              id="goods-community-body"
              maxLength={1200}
              name="body"
              placeholder="写下你的收藏感受。"
              required
            />
          </div>

          <div className="space-y-3">
            <label
              className="text-muted-foreground block text-[0.68rem] font-semibold uppercase"
              htmlFor="goods-community-images"
            >
              图片
            </label>
            <input
              accept="image/*"
              className="border-border/70 bg-background/82 file:bg-secondary file:text-secondary-foreground file:hover:bg-secondary/90 text-muted-foreground block w-full rounded-[var(--radius)] border px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold"
              id="goods-community-images"
              multiple
              name="images"
              onChange={(event) => {
                setSelectedFiles(
                  Array.from(event.currentTarget.files ?? []).map(
                    (file) => file.name,
                  ),
                );
              }}
              type="file"
            />
            <p className="text-muted-foreground text-sm">
              最多 4 张，每张不超过 5 MB。
            </p>
            {selectedFiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((fileName) => (
                  <span
                    className="border-border/70 bg-card/76 text-foreground rounded-full border px-3 py-1 text-xs"
                    key={fileName}
                  >
                    {fileName}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {state.status === 'error' && state.message ? (
            <div className="border-destructive/30 bg-destructive/8 text-muted-foreground rounded-[var(--radius)] border px-4 py-3 text-sm leading-7">
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <SubmitButton />
            <span className="border-border/70 bg-background/76 text-muted-foreground inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm">
              提交后进入审核
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
