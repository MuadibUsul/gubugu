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
      className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? '提交中...' : '提交审核'}
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
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
              社区发布
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              添加收藏笔记
            </h2>
            <p className="text-muted-foreground text-sm leading-7">
              评论和图片都只会挂在这个 SKU 下，并且会先经过待审核步骤，之后才会公开展示。
            </p>
          </div>

          <Button asChild>
            <Link
              href={`/login?next=${encodeURIComponent(`${nextPath}#community`)}`}
            >
              登录后评论
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
              社区发布
            </p>
            <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-xs">
              {userLabel ?? '已登录收藏者'}
            </span>
          </div>
          <h2 className="font-heading text-foreground text-4xl leading-none">
            评论与晒单图片
          </h2>
          <p className="text-muted-foreground text-sm leading-7">
            笔记会始终绑定在这个 SKU 下。这里不做全站动态流，也不做交易讨论串，只保留审核后的藏家上下文。
          </p>
        </div>

        {hasPendingSubmission ? (
          <div className="border-border/70 bg-accent/12 text-foreground rounded-[1.35rem] border px-4 py-4 text-sm leading-7">
            你最近一次社区投稿已经进入待审核状态。只有人工通过后，它才会显示在这个 SKU 页面下。
          </div>
        ) : null}

        <form
          action={formAction}
          className="space-y-4"
        >
          <input name="goodsId" type="hidden" value={goodsId} />
          <input name="nextPath" type="hidden" value={nextPath} />

          <div className="space-y-3">
            <label
              className="text-muted-foreground block text-[0.68rem] font-semibold tracking-[0.28em] uppercase"
              htmlFor="goods-community-body"
            >
              笔记内容
            </label>
            <textarea
              className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-32 w-full rounded-[1.4rem] border px-4 py-4 text-sm leading-7 transition outline-none focus-visible:ring-2"
              id="goods-community-body"
              maxLength={1200}
              name="body"
              placeholder="写下你对印刷、包装、摆放观感、抽选结果，或者这件 SKU 为什么值得放进收藏架的简短说明。"
              required
            />
          </div>

          <div className="space-y-3">
            <label
              className="text-muted-foreground block text-[0.68rem] font-semibold tracking-[0.28em] uppercase"
              htmlFor="goods-community-images"
            >
              晒单图片
            </label>
            <input
              accept="image/*"
              className="border-border/70 bg-background/82 file:bg-secondary file:text-secondary-foreground file:hover:bg-secondary/90 text-muted-foreground block w-full rounded-[1.4rem] border px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold"
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
            <p className="text-muted-foreground text-sm leading-6">
              最多上传 4 张图片。每个文件都必须是真实图片，大小不超过 5 MB，并会在审核通过前保持待审核状态。
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
            <div className="border-destructive/30 bg-destructive/8 text-muted-foreground rounded-[1.25rem] border px-4 py-3 text-sm leading-7">
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <SubmitButton />
            <span className="border-border/70 bg-background/76 text-muted-foreground inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm">
              会以待审核状态保存到这个 SKU 下
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
