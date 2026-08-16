import Image from 'next/image';

import { Button } from '@/components/ui/button';
import type { RecognitionCandidate } from '@/lib/recognition';

type RecognitionCandidateCardProps = {
  candidate: RecognitionCandidate;
  isConfirmed: boolean;
  onConfirm: (candidate: RecognitionCandidate) => void;
  compact?: boolean;
};

function getConfidenceLabel(score: number) {
  if (score >= 0.86) {
    return '高度接近';
  }

  if (score >= 0.72) {
    return '较高可能';
  }

  if (score >= 0.58) {
    return '可作为候选';
  }

  return '信号偏弱';
}

export function RecognitionCandidateCard({
  candidate,
  isConfirmed,
  onConfirm,
  compact = false,
}: RecognitionCandidateCardProps) {
  const confidence = Math.round(candidate.score * 100);
  const confidenceLabel = getConfidenceLabel(candidate.score);
  const characterLabel =
    candidate.goods.characterNames.length > 0
      ? candidate.goods.characterNames.join(' / ')
      : '未关联角色';
  const attributeChips = [
    candidate.goods.goodsType,
    candidate.goods.material,
    candidate.goods.sizeLabel,
  ].filter((value): value is string => Boolean(value));

  return (
    <article
      className={
        compact
          ? 'panel-float rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--border)_84%,white_8%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_82%,transparent),color-mix(in_oklab,var(--surface-soft)_84%,var(--background)))] p-4'
          : isConfirmed
            ? 'panel-float rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--accent)_54%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_10%,transparent),color-mix(in_oklab,var(--surface-strong)_88%,var(--background)))] p-5'
            : 'panel-float rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--accent)_16%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_82%,transparent),color-mix(in_oklab,var(--surface-soft)_84%,var(--background)))] p-5'
      }
    >
      <div className="flex gap-4">
        <div className="hud-card relative h-28 w-24 shrink-0 overflow-hidden rounded-[var(--radius)]">
          {candidate.goods.primaryImageUrl ? (
            <Image
              alt={candidate.goods.name}
              className="object-cover"
              fill
              sizes="96px"
              src={candidate.goods.primaryImageUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-xs leading-5 text-[color:color-mix(in_oklab,var(--foreground)_56%,var(--background))]">
              暂无图片
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="hud-chip px-3 py-1 text-[0.68rem] font-semibold uppercase">
                  Top {candidate.rank}
                </span>
                <span className="hud-chip text-muted-foreground px-3 py-1 text-xs">
                  {candidate.goods.skuCode}
                </span>
                {isConfirmed ? (
                  <span className="hud-chip border-[color:color-mix(in_oklab,var(--primary)_38%,white)] bg-[color:color-mix(in_oklab,var(--primary)_20%,transparent)] px-3 py-1 text-xs font-semibold">
                    已选定
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                <h3 className="text-foreground text-base leading-6 font-semibold">
                  {candidate.goods.name}
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  {characterLabel}
                </p>
                <p className="text-sm leading-6 text-[color:color-mix(in_oklab,var(--foreground)_68%,var(--background))]">
                  {candidate.goods.seriesName} / {candidate.goods.ipName}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-heading text-foreground text-4xl leading-none">
                {confidence}
              </p>
              <p className="text-muted-foreground mt-1 text-xs uppercase">
                {confidenceLabel}
              </p>
            </div>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-[color:color-mix(in_oklab,var(--background)_74%,var(--card))]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--accent)_76%,white),color-mix(in_oklab,var(--primary)_54%,white))]"
              style={{ width: `${confidence}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {attributeChips.map((attribute) => (
              <span
                className="hud-chip text-muted-foreground px-3 py-1 text-xs"
                key={`${candidate.id}-${attribute}`}
              >
                {attribute}
              </span>
            ))}
          </div>

          {!compact ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="hud-card px-4 py-3">
                <p className="text-muted-foreground text-[0.66rem] uppercase">
                  匹配依据
                </p>
                <p className="text-foreground mt-2 text-sm leading-6">
                  {candidate.matchReason}
                </p>
              </div>

              <Button
                className="w-full lg:w-auto"
                onClick={() => onConfirm(candidate)}
                type="button"
                variant={isConfirmed ? 'secondary' : 'default'}
              >
                {isConfirmed ? '已确认' : '是，就是它'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground line-clamp-1 text-sm">
                {candidate.matchReason}
              </p>
              <Button
                className="shrink-0"
                onClick={() => onConfirm(candidate)}
                type="button"
                variant={isConfirmed ? 'secondary' : 'outline'}
              >
                {isConfirmed ? '已确认' : '选择'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
