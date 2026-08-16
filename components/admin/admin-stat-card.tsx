import type { AdminStatisticCard } from '@/server/data';

type AdminStatCardProps = {
  stat: AdminStatisticCard;
};

const toneClasses: Record<AdminStatisticCard['tone'], string> = {
  accent:
    'border-[color:color-mix(in_oklab,var(--accent)_42%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]',
  default:
    'border-[color:color-mix(in_oklab,var(--accent)_16%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_84%,transparent),color-mix(in_oklab,var(--surface-soft)_82%,var(--background)))]',
  warning:
    'border-[color:color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color:color-mix(in_oklab,var(--primary)_10%,transparent)]',
  quiet:
    'border-[color:color-mix(in_oklab,var(--border)_86%,white_8%)] bg-[color:color-mix(in_oklab,var(--card)_78%,var(--background))]',
};

function getStatDescription(stat: AdminStatisticCard) {
  switch (stat.key) {
    case 'sku-records':
      return '当前已收录的 SKU 总量。';
    case 'official-images':
      return '可用于详情页、搜索和图鉴展示的商品图片。';
    case 'community-items':
      return '当前公开中的评论、图片与社区内容。';
    case 'open-exchanges':
      return '当前公开中的交换意向记录。';
    default:
      return stat.description;
  }
}

export function AdminStatCard({ stat }: AdminStatCardProps) {
  return (
    <article className={`${toneClasses[stat.tone]} hud-card px-5 py-5`}>
      <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
        {stat.label}
      </p>
      <p className="font-heading text-foreground mt-3 text-5xl leading-none">
        {stat.value}
      </p>
      <p className="mt-3 text-sm leading-6 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))]">
        {getStatDescription(stat)}
      </p>
    </article>
  );
}
