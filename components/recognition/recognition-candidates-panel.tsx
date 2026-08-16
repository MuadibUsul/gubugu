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

function getResultTone(candidates: RecognitionCandidate[]) {
  if (candidates.length === 0) {
    return {
      eyebrow: '没有可用候选',
      title: '这次没能锁定目标',
      description: '换一张更清晰的图再试。',
      toneClass:
        'border-border/70 bg-background/74 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-5',
      isWeak: false,
    };
  }

  const topScore = candidates[0]?.score ?? 0;

  if (topScore < recognitionStrongMatchThreshold) {
    return {
      eyebrow: '结果偏弱',
      title: '先看最接近的一件',
      description: '如果不对，直接重拍。',
      toneClass:
        'border-[color:color-mix(in_oklab,var(--accent)_30%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_8%,white)] text-[color:color-mix(in_oklab,var(--foreground)_82%,var(--background))] rounded-[var(--radius)] border px-4 py-5',
      isWeak: true,
    };
  }

  return {
    eyebrow: '已找到最佳候选',
    title: '先确认这一件',
    description: '其他候选放在下面。',
    toneClass:
      'border-[color:color-mix(in_oklab,var(--accent)_42%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,white)] text-[color:color-mix(in_oklab,var(--foreground)_84%,var(--background))] rounded-[var(--radius)] border px-4 py-5',
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
  const limitedCandidates = candidates.slice(
    0,
    recognitionCandidateDisplayLimit,
  );
  const [topCandidate, ...otherCandidates] = limitedCandidates;
  const confirmedCandidate =
    limitedCandidates.find(
      (candidate) => candidate.id === confirmedCandidateId,
    ) ?? null;
  const resultTone = getResultTone(limitedCandidates);

  return (
    <section className="collection-panel p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              Candidates
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              识别结果
            </h2>
          </div>
          <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
            {providerLabel}
          </span>
        </div>

        {resultState === 'idle' ? (
          <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-5 text-sm">
            先拍照或上传图片。
          </div>
        ) : null}

        {resultState === 'processing' ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                className="border-border/70 bg-background/78 rounded-[var(--radius)] border p-4"
                key={item}
              >
                <div className="flex gap-4">
                  <div className="h-28 w-24 animate-pulse rounded-[var(--radius)] bg-[color:color-mix(in_oklab,var(--border)_54%,white)]" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-44 animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--accent)_16%,white)]" />
                    <div className="h-3 w-56 animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--border)_56%,white)]" />
                    <div className="h-2.5 w-full animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--border)_48%,white)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {resultState === 'error' ? (
          <div className="border-destructive/30 bg-destructive/8 rounded-[var(--radius)] border px-4 py-5">
            <p className="text-destructive text-sm font-semibold">识别失败</p>
            <p className="mt-2 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_74%,var(--background))]">
              {errorMessage ?? '识别服务没有返回可用结果。'}
            </p>
            <div className="mt-4">
              <Button onClick={onRetake} type="button" variant="outline">
                重新拍摄
              </Button>
            </div>
          </div>
        ) : null}

        {resultState === 'ready' ? (
          <div className="space-y-4">
            <div className={resultTone.toneClass}>
              <p className="text-[0.68rem] font-semibold uppercase">
                {resultTone.eyebrow}
              </p>
              <h3 className="text-foreground mt-2 text-2xl leading-tight font-semibold">
                {resultTone.title}
              </h3>
              <p className="mt-3 text-sm leading-7">{resultTone.description}</p>
            </div>

            {topCandidate ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                  首选
                </p>
                <RecognitionCandidateCard
                  candidate={topCandidate}
                  isConfirmed={topCandidate.id === confirmedCandidateId}
                  onConfirm={onConfirmCandidate}
                />
              </div>
            ) : (
              <div className="border-border/70 bg-background/74 rounded-[var(--radius)] border border-dashed px-4 py-5 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))]">
                当前画面没有达到可用匹配。
              </div>
            )}

            {otherCandidates.length > 0 ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                  其他候选
                </p>
                <div className="space-y-3">
                  {otherCandidates.map((candidate) => (
                    <RecognitionCandidateCard
                      candidate={candidate}
                      compact
                      isConfirmed={candidate.id === confirmedCandidateId}
                      key={candidate.id}
                      onConfirm={onConfirmCandidate}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {confirmedCandidate ? (
              <div className="rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--accent)_46%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_12%,white),color-mix(in_oklab,var(--background)_95%,var(--card)))] px-4 py-5">
                <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                  已确认
                </p>
                <h3 className="text-foreground mt-2 text-xl leading-tight font-semibold">
                  {confirmedCandidate.goods.name}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))]">
                  {confirmedCandidate.goods.skuCode}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {warnings.length > 0 && resultState === 'ready' ? (
          <div className="border-border/70 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
            <div className="flex flex-wrap gap-2">
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

        {resultState === 'ready' && resultTone.isWeak ? (
          <div className="flex justify-end">
            <Button onClick={onRetake} type="button" variant="outline">
              重新拍摄
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
