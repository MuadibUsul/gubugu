'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import {
  recognitionCandidateSchema,
  type RecognitionCandidate,
} from '@/lib/recognition';
import { MAX_SCAN_BATCH } from '@/lib/scan-batch';
import { RecognitionShell } from './recognition-shell';

type Photo = { file: File; url: string; fingerprint: number[] };
type Item = {
  id: string;
  front: Photo;
  back?: Photo;
  requestId?: string;
  candidates?: RecognitionCandidate[];
  candidateId?: string;
  saved?: boolean;
  uncertain?: boolean;
  error?: string;
};
type Target = { id: string; side: 'front' | 'back' };
const matchSchema = z.object({
  ok: z.literal(true),
  requestId: z.string().uuid(),
  candidates: z.array(recognitionCandidateSchema),
});
class RejectedRequest extends Error {}

export function ScanBatch({
  supplement,
}: {
  supplement?: { id: string; frontUrl: string };
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [review, setReview] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [previousFrame, setPreviousFrame] = useState<number[]>();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [supplementPhoto, setSupplementPhoto] = useState<Photo>();
  const [supplementSaved, setSupplementSaved] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const controllers = useRef(new Set<AbortController>());
  useEffect(() => {
    mounted.current = true;
    const pending = controllers.current;
    return () => {
      mounted.current = false;
      pending.forEach((controller) => controller.abort());
    };
  }, []);

  const unsaved =
    items.some((item) => !item.saved) ||
    Boolean(supplementPhoto && !supplementSaved);
  useEffect(() => {
    if (!unsaved) return;
    const preventClose = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', preventClose);
    return () => window.removeEventListener('beforeunload', preventClose);
  }, [unsaved]);

  async function send(url: string, body: FormData) {
    const controller = new AbortController();
    controllers.current.add(controller);
    const timer = window.setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        body,
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new RejectedRequest(
          data.error?.message ?? data.message ?? '请求失败，请重试。',
        );
      return data;
    } finally {
      window.clearTimeout(timer);
      controllers.current.delete(controller);
    }
  }

  function update(id: string, change: Partial<Item>) {
    if (mounted.current)
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...change } : item)),
      );
  }

  async function matchItems(batch: Item[]) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('正在匹配正面…');
    try {
      for (const item of batch) {
        if (!mounted.current) break;
        if (item.saved || item.uncertain) continue;
        try {
          const body = new FormData();
          body.set('image', item.front.file);
          body.set('previewOnly', 'true');
          const data = matchSchema.parse(
            await send('/api/recognition/scan', body),
          );
          update(item.id, {
            requestId: data.requestId,
            candidates: data.candidates,
            candidateId: undefined,
            error: undefined,
          });
        } catch {
          update(item.id, {
            error: '暂时无法匹配，可以重试，或直接保存为未鉴定收藏。',
          });
        }
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  function finish() {
    setReview(true);
    setTarget(null);
    void matchItems(
      items.filter((item) => !item.saved && !item.uncertain && !item.requestId),
    );
  }

  function capture(file: File, url: string, fingerprint: number[]) {
    if (busyRef.current) return;
    const photo = { file, url, fingerprint };
    if (supplement) {
      setSupplementPhoto(photo);
      setReview(true);
      return;
    }
    if (target) {
      update(
        target.id,
        target.side === 'back'
          ? { back: photo }
          : {
              front: photo,
              requestId: undefined,
              candidates: undefined,
              candidateId: undefined,
              error: undefined,
            },
      );
      setTarget(null);
      setReview(true);
    } else if (items.length < MAX_SCAN_BATCH) {
      const next = [...items, { id: crypto.randomUUID(), front: photo }];
      setItems(next);
      setMessage(`已拍 ${next.length} 件`);
      if (next.length === MAX_SCAN_BATCH) {
        setReview(true);
        void matchItems(next.filter((item) => !item.saved && !item.requestId));
      }
    }
    setPreviousFrame(fingerprint);
    setCameraKey((key) => key + 1);
  }

  function retake(id: string, side: 'front' | 'back') {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.saved || item.uncertain || busyRef.current) return;
    setTarget({ id, side });
    // Give the user time to flip: the front still under the lens is not a back.
    setPreviousFrame(
      side === 'back'
        ? items.find((item) => item.id === id)?.front.fingerprint
        : undefined,
    );
    setCameraKey((key) => key + 1);
    setReview(false);
  }

  async function save() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('正在保存…');
    setMessage('');
    let failures = 0;
    try {
      for (const item of items.filter((entry) => !entry.saved)) {
        if (!mounted.current) break;
        try {
          const body = new FormData();
          body.set('captureId', item.id);
          body.set('front', item.front.file);
          if (item.back) body.set('back', item.back.file);
          if (item.requestId) body.set('requestId', item.requestId);
          if (item.candidateId) body.set('candidateId', item.candidateId);
          const response = await send('/api/user-scans', body);
          if (!response.success) throw new Error('保存未完成。');
          update(item.id, { saved: true, uncertain: false, error: undefined });
        } catch (error) {
          failures++;
          update(item.id, {
            uncertain: !(error instanceof RejectedRequest),
            error:
              error instanceof RejectedRequest
                ? error.message
                : '暂未收到保存结果，请保持照片不变并重试保存，不会重复入库。',
          });
        }
      }
      if (mounted.current) {
        setMessage(
          failures
            ? `${failures} 件未保存，请重试；成功的不会重复保存。`
            : '已全部保存到个人谷柜',
        );
        router.refresh();
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  async function saveSupplement() {
    if (!supplement || !supplementPhoto || busyRef.current) return;
    busyRef.current = true;
    setBusy('正在保存背面…');
    try {
      const body = new FormData();
      body.set('scanId', supplement.id);
      body.set('back', supplementPhoto.file);
      const response = await send('/api/user-scans', body);
      if (!response.success) throw new Error('保存未完成。');
      setSupplementSaved(true);
      setMessage('背面已保存');
      router.refresh();
    } catch {
      setMessage('背面未保存，请检查网络后重试。');
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  const button =
    'rounded-lg border border-[var(--rule)] px-3 py-2 text-sm disabled:opacity-40';
  const primary = `${button} bg-[var(--shu)] text-white`;
  const isCamera =
    !review &&
    (Boolean(supplement) || Boolean(target) || items.length < MAX_SCAN_BATCH);
  return (
    <div className="space-y-3 pb-4">
      {isCamera ? (
        <>
          <div className="[&_.scanner]:min-h-[calc(100dvh-235px)] [&_.scanner__frame]:h-[75%] [&_.scanner__frame]:max-h-[75%] [&_.scanner__frame]:w-auto">
            <RecognitionShell
              key={cameraKey}
              onCapture={capture}
              previousFrame={previousFrame}
              title={
                supplement || target?.side === 'back'
                  ? '翻面 · 补拍背面'
                  : target
                    ? '重拍正面'
                    : `正面 · ${items.length}/${MAX_SCAN_BATCH}`
              }
              onClose={() => {
                if (items.length || supplement) {
                  setTarget(null);
                  setReview(true);
                } else router.back();
              }}
            />
          </div>
          {supplement ? (
            <p className="text-center text-sm">请将这件藏品翻到背面</p>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="flex min-w-0 flex-1 gap-2 overflow-x-auto"
                aria-label="已拍收藏"
              >
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className="shrink-0 text-center text-xs"
                    onClick={() => {
                      setReview(true);
                      setTarget(null);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="h-12 w-9 rounded object-cover"
                      src={item.front.url}
                      alt={`第 ${index + 1} 件正面`}
                    />
                    {item.back ? '双面' : '正面'}
                  </button>
                ))}
              </div>
              {items.length > 0 &&
              !target &&
              !items[items.length - 1].saved &&
              !items[items.length - 1].uncertain ? (
                <button
                  className={button}
                  onClick={() => retake(items[items.length - 1].id, 'back')}
                >
                  补拍背面
                </button>
              ) : null}
              <button
                className={primary}
                disabled={!items.length}
                onClick={finish}
              >
                完成 {items.length || ''}
              </button>
            </div>
          )}
        </>
      ) : supplement ? (
        <section className="space-y-4">
          <h1 className="text-xl font-semibold">补拍背面</h1>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-full rounded-lg"
              src={supplement.frontUrl}
              alt="已有正面"
            />
            {supplementPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="w-full rounded-lg"
                src={supplementPhoto.url}
                alt="本次背面"
              />
            ) : (
              <p>尚未拍摄背面</p>
            )}
          </div>
          {!supplementSaved ? (
            <div className="flex gap-2">
              <button
                className={button}
                disabled={Boolean(busy)}
                onClick={() => {
                  setReview(false);
                  setCameraKey((key) => key + 1);
                }}
              >
                重拍背面
              </button>
              <button
                className={primary}
                disabled={!supplementPhoto || Boolean(busy)}
                onClick={() => void saveSupplement()}
              >
                保存背面
              </button>
            </div>
          ) : null}
          <Link className={button} href="/me/collection#unverified">
            返回谷柜
          </Link>
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              核对本次收藏 · {items.length} 件
            </h1>
            <button
              className={button}
              disabled={Boolean(busy) || items.length >= MAX_SCAN_BATCH}
              onClick={() => {
                setReview(false);
                setTarget(null);
                setCameraKey((key) => key + 1);
              }}
            >
              继续扫描
            </button>
          </div>
          <p className="text-muted-foreground text-sm">
            选择对应商品可点亮收藏；没有合适候选就先存为未鉴定。正反面仅自己可见。
          </p>
          {items.map((item, index) => (
            <section
              key={item.id}
              className="space-y-3 rounded-xl border border-[var(--rule)] p-3"
            >
              <div className="flex justify-between text-sm">
                <strong>
                  第 {index + 1} 件{item.saved ? ' · 已保存' : ''}
                </strong>
                <button
                  className="text-muted-foreground"
                  disabled={Boolean(busy) || item.saved || item.uncertain}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((entry) => entry.id !== item.id),
                    )
                  }
                >
                  删除
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['front', 'back'] as const).map((side) => (
                  <div key={side} className="space-y-2 text-center">
                    {item[side] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="mx-auto h-40 max-w-full rounded object-contain"
                        src={item[side].url}
                        alt={side === 'front' ? '正面' : '背面'}
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded bg-[var(--surface)] text-sm text-[var(--shu)]">
                        谷布谷 · 默认卡背
                      </div>
                    )}
                    <button
                      className={button}
                      disabled={Boolean(busy) || item.saved || item.uncertain}
                      onClick={() => retake(item.id, side)}
                    >
                      {side === 'front'
                        ? '重拍正面'
                        : item.back
                          ? '重拍背面'
                          : '补拍背面'}
                    </button>
                  </div>
                ))}
              </div>
              <label className="block text-sm">
                收藏归属
                <select
                  className="ui-field mt-1 w-full p-2"
                  disabled={Boolean(busy) || item.saved || item.uncertain}
                  value={item.candidateId ?? ''}
                  onChange={(event) =>
                    update(item.id, {
                      candidateId: event.target.value || undefined,
                    })
                  }
                >
                  <option value="">暂存为未鉴定收藏</option>
                  {item.candidates?.map((candidate) => (
                    <option value={candidate.id} key={candidate.id}>
                      {candidate.goods.name} · 相似度{' '}
                      {Math.round(candidate.score * 100)}%
                    </option>
                  ))}
                </select>
              </label>
              {item.candidateId
                ? (() => {
                    const selected = item.candidates?.find(
                      (c) => c.id === item.candidateId,
                    );
                    return selected ? (
                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                        {selected.goods.primaryImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selected.goods.primaryImageUrl}
                            alt={selected.goods.name}
                            className="h-20 w-16 rounded object-contain"
                          />
                        ) : null}
                        <p>
                          {selected.goods.ipName} · {selected.goods.seriesName}{' '}
                          · {selected.goods.material ?? ''}{' '}
                          {selected.goods.sizeLabel ?? ''}
                        </p>
                      </div>
                    ) : null;
                  })()
                : null}
              {!item.saved ? (
                <button
                  className={button}
                  disabled={Boolean(busy) || item.uncertain}
                  onClick={() => void matchItems([item])}
                >
                  {item.requestId ? '重新匹配' : '匹配正面'}
                </button>
              ) : null}
              {item.error ? (
                <p role="alert" className="text-sm text-[var(--shu)]">
                  {item.error}
                </p>
              ) : null}
            </section>
          ))}
          {items.some((item) => !item.saved) ? (
            <button
              className={`${primary} w-full`}
              disabled={Boolean(busy)}
              onClick={() => void save()}
            >
              确认保存 {items.filter((item) => !item.saved).length} 件
            </button>
          ) : items.length ? (
            <Link
              className={`${primary} block text-center`}
              href="/me/collection#unverified"
            >
              查看个人谷柜
            </Link>
          ) : (
            <p>本批没有照片，可以继续扫描。</p>
          )}
        </>
      )}
      <p aria-live="polite" className="text-center text-sm">
        {busy ?? message}
      </p>
    </div>
  );
}
