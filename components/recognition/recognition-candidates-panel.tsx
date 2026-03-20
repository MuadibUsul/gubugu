import { Button } from '@/components/ui/button';
import {
  recognitionCandidateDisplayLimit,
  recognitionStrongMatchThreshold,
  type RecognitionCandidate,
} from '@/lib/recognition';

import { RecognitionCandidateCard } from '@/components/recognition/recognition-candidate-card';

type RecognitionCandidatesPanelProps = {
  resultState: 'idle' | 'processing' | 'ready' | 'error';
  errorMessage: string | null;
  providerLabel: string;
  candidates: RecognitionCandidate[];
  warnings: string[];
  confirmedCandidateId: string | null;
  onConfirmCandidate: (candidate: RecognitionCandidate) => void;
  onRetake: () => void;
};

function getResultCopy(candidates: RecognitionCandidatesPanelProps['candidates']) {
  if (candidates.length === 0) {
    return {
      eyebrow: '没有接近候选',
      title: '暂时没有找到足够接近的候选结果',
      description:
        '可以尝试在更均匀的光线下重拍、靠近取景框，或者上传裁切更清晰的图片。',
      toneClass:
        'border-border/70 bg-background/74 text-muted-foreground rounded-[1.6rem] border border-dashed px-4 py-5',
      isWeak: false,
    };
  }

  const topScore = candidates[0]?.score ?? 0;

  if (topScore < recognitionStrongMatchThreshold) {
    return {
      eyebrow: '置信度较低',
      title: '我们找到了可能匹配项，但当前信号偏弱',
      description:
        '当前图片与图鉴记录只形成了较弱匹配，请谨慎确认，或重新取景后再试一次。',
      toneClass:
        'border-[color:color-mix(in_oklab,var(--accent)_30%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_8%,white)] text-[color:color-mix(in_oklab,var(--foreground)_82%,var(--background))] rounded-[1.6rem] border px-4 py-5',
      isWeak: true,
    };
  }

  return {
    eyebrow: '前 5 个候选',
    title: '我们判断你拍到的可能是这些商品之一',
    description:
      '系统已经按相似度排出最接近的图鉴候选，等待你手动确认。',
    toneClass:
      'border-[color:color-mix(in_oklab,var(--accent)_42%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,white)] text-[color:color-mix(in_oklab,var(--foreground)_84%,var(--background))] rounded-[1.6rem] border px-4 py-5',
    isWeak: false,
  };
}

export function RecognitionCandidatesPanel({
  resultState,
  errorMessage,
  providerLabel,
  candidates,
  warnings,
  confirmedCandidateId,
  onConfirmCandidate,
  onRetake,
}: RecognitionCandidatesPanelProps) {
  const limitedCandidates = candidates.slice(0, recognitionCandidateDisplayLimit);
  const confirmedCandidate =
    limitedCandidates.find((candidate) => candidate.id === confirmedCandidateId) ??
    null;
  const resultCopy = getResultCopy(limitedCandidates);

  return (
    <section className="collection-panel p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
              候选结果
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              识别候选
            </h2>
            <p className="text-muted-foreground text-sm leading-7">
              这条链路始终以确认体验优先：先返回排序后的候选，再由用户确认最终商品目标。
            </p>
          </div>
          <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
            {providerLabel}
          </span>
        </div>

        {resultState === 'idle' ? (
          <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[1.6rem] border border-dashed px-4 py-5 text-sm leading-7">
            请先拍照或上传一张图片。待识别服务返回排序结果后，这里才会出现候选列表。
          </div>
        ) : null}

        {resultState === 'processing' ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <div
                className="border-border/70 bg-background/78 rounded-[1.5rem] border p-4"
                key={item}
              >
                <div className="flex gap-4">
                  <div className="h-28 w-24 animate-pulse rounded-[1.2rem] bg-[color:color-mix(in_oklab,var(--border)_54%,white)]" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="h-4 w-44 animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--accent)_16%,white)]" />
                        <div className="h-3 w-56 animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--border)_56%,white)]" />
                      </div>
                      <div className="h-12 w-14 animate-pulse rounded-2xl bg-[color:color-mix(in_oklab,var(--border)_56%,white)]" />
                    </div>
                    <div className="h-2.5 w-full animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--border)_48%,white)]" />
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2].map((chip) => (
                        <div
                          className="h-7 w-20 animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--border)_48%,white)]"
                          key={chip}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {resultState === 'error' ? (
          <div className="border-destructive/30 bg-destructive/8 rounded-[1.6rem] border px-4 py-5">
            <p className="text-destructive text-sm font-semibold">
              识别请求失败
            </p>
            <p className="text-[color:color-mix(in_oklab,var(--foreground)_74%,var(--background))] mt-2 text-sm leading-7">
              {errorMessage ?? '识别服务没有返回可用结果。'}
            </p>
            <div className="mt-4">
              <Button onClick={onRetake} type="button" variant="outline">
                重新拍摄或重新上传
              </Button>
            </div>
          </div>
        ) : null}

        {resultState === 'ready' ? (
          <div className="space-y-4">
            <div className={resultCopy.toneClass}>
              <p className="text-[0.68rem] font-semibold tracking-[0.22em] uppercase">
                {resultCopy.eyebrow}
              </p>
              <h3 className="text-foreground mt-2 text-2xl font-semibold leading-tight">
                {resultCopy.title}
              </h3>
              <p className="mt-3 text-sm leading-7">{resultCopy.description}</p>
            </div>

            {limitedCandidates.length > 0 ? (
              <div className="space-y-3">
                {limitedCandidates.map((candidate) => (
                  <RecognitionCandidateCard
                    candidate={candidate}
                    isConfirmed={candidate.id === confirmedCandidateId}
                    key={candidate.id}
                    onConfirm={onConfirmCandidate}
                  />
                ))}
              </div>
            ) : (
              <div className="border-border/70 bg-background/74 rounded-[1.6rem] border border-dashed px-4 py-5 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))]">
                当前画面没有候选达到匹配阈值。
              </div>
            )}

            {confirmedCandidate ? (
              <div className="border-[color:color-mix(in_oklab,var(--accent)_46%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_12%,white),color-mix(in_oklab,var(--background)_95%,var(--card)))] rounded-[1.6rem] border px-4 py-5">
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.22em] uppercase">
                  已确认目标
                </p>
                <h3 className="text-foreground mt-2 text-xl font-semibold leading-tight">
                  {confirmedCandidate.goods.name}
                </h3>
                <p className="text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] mt-2 text-sm leading-7">
                  当前目标已锁定为 {confirmedCandidate.goods.skuCode}。确认候选后，会直接带着识别确认状态跳转到商品详情页。
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {warnings.length > 0 && resultState === 'ready' ? (
          <div className="border-border/70 bg-card/72 rounded-[1.45rem] border px-4 py-4">
            <p className="text-muted-foreground text-[0.66rem] tracking-[0.22em] uppercase">
              识别提示
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {warnings.map((warning) => (
                <span
                  className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-xs"
                  key={warning}
                >
                  {warning}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {resultState === 'ready' && resultCopy.isWeak ? (
          <div className="flex justify-end">
            <Button onClick={onRetake} type="button" variant="outline">
              重新拍摄以获得更稳定匹配
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
