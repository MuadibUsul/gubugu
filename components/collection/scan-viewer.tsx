'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { HoloCard } from '@/components/collection/holo-card';
import { updateUserScanNoteAction } from '@/server/user-scans/actions';

type Scan = {
  id: string;
  topScore: number | null;
  note: string | null;
  imageUrl: string;
  backImageUrl: string | null;
  goodsName: string | null;
  resolved: boolean;
};

/**
 * 未鉴定扫描：网格里是**静态**真彩缩略图（可点开），点开后在弹层里用**单张**可交互
 * 全息卡展示（可拖动转、翻面），并可改私人备注 / 重新扫描。一次只挂一张交互卡，避免
 * 网格里堆多张 HoloCard 造成卡顿。
 */
export function ScanViewer({ scans }: { scans: Scan[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = scans.find((s) => s.id === openId) ?? null;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {scans.map((scan) => (
          <button
            className="relative block overflow-hidden rounded-[8px] border border-dashed border-[var(--rule)] bg-[var(--surface)] text-left"
            key={scan.id}
            onClick={() => setOpenId(scan.id)}
            type="button"
          >
            <div className="goods-card__art relative aspect-[3/4] rounded-none">
              {/* 私密资产走鉴权路由，同源 <img> 会带上 cookie */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="未鉴定收藏"
                className="goods-card__art-image"
                loading="lazy"
                src={scan.imageUrl}
              />
              <span className="absolute top-1.5 left-1.5 rounded-[4px] bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {scan.resolved ? '已归属' : '未鉴定'}
              </span>
            </div>
            <p className="truncate px-2 py-1.5 text-[11.5px]">
              {scan.goodsName || scan.note || '未鉴定收藏'}
            </p>
          </button>
        ))}
      </div>

      {active ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpenId(null)}
          role="dialog"
        >
          <div
            className="max-h-[92vh] w-full max-w-[380px] overflow-y-auto rounded-[16px] bg-[var(--background)] p-4 [scrollbar-width:none]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium">
                {active.goodsName ?? '未鉴定收藏'} · 仅自己可见
              </p>
              <button
                aria-label="关闭"
                className="text-muted-foreground px-2 text-lg leading-none"
                onClick={() => setOpenId(null)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="mx-auto w-full max-w-[300px]">
              <HoloCard
                alt="未鉴定收藏"
                key={active.id}
                src={active.imageUrl}
                backSrc={active.backImageUrl ?? undefined}
              />
            </div>

            <p className="text-muted-foreground mt-2 text-center text-[11px]">
              {active.resolved
                ? '已归属到官方 SKU'
                : typeof active.topScore === 'number'
                  ? `最接近官方图 ${active.topScore}% · 未达点亮阈值`
                  : '暂未匹配到官方 SKU'}
              {' · 拖动卡面转动 · 点卡面翻背'}
            </p>
            <Link
              className="mt-3 block rounded-lg border border-[var(--rule)] p-2 text-center text-sm"
              href={`/recognition?scanId=${active.id}`}
            >
              {active.backImageUrl ? '重拍背面' : '补拍背面'}
            </Link>

            <form
              action={updateUserScanNoteAction}
              className="mt-3 space-y-2 border-t border-[var(--rule)] pt-3"
            >
              <label className="text-muted-foreground block text-[11px]">
                私人备注（记录角色 / 系列 / 来源）
                <textarea
                  className="ui-field mt-1 min-h-16 w-full resize-y p-2 text-[12px]"
                  defaultValue={active.note ?? ''}
                  maxLength={500}
                  name="note"
                  placeholder="例如：芙宁娜 · 命定之日 · 微店购入"
                />
              </label>
              <input name="scanId" type="hidden" value={active.id} />
              <div className="flex items-center gap-2">
                <button
                  className="flex-1 rounded-[8px] bg-[var(--shu)] px-3 py-2 text-[12px] font-semibold text-white"
                  type="submit"
                >
                  保存备注
                </button>
                <Link
                  className="rounded-[8px] border border-[var(--rule)] px-3 py-2 text-[12px]"
                  href="/recognition"
                >
                  重新扫描
                </Link>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
