import Link from 'next/link';

import { formatGoodsTypeLabel } from '@/components/search/search-query';

const goodsTypes = [
  'acrylic-stand',
  'can-badge',
  'mini-shikishi',
  'clear-card',
  'rubber-strap',
  'tapestry',
  'photo-set',
  'pass-holder',
] as const;

const entries = [
  {
    label: '公共谷库',
    href: '/search',
    note: '浏览全部谷子与点亮缺口',
    mark: '藏',
    tone: 'bg-[var(--kin-soft)] text-[var(--ink)]',
  },
  {
    label: '扫描点亮',
    href: '/recognition',
    note: '识别手中的实物并点亮',
    mark: '◎',
    tone: 'bg-[var(--sky-soft)] text-[var(--sky)]',
  },
  {
    label: '我的谷柜',
    href: '/me/collection',
    note: '看收藏和补全进度',
    mark: '♡',
    tone: 'bg-[var(--shu-soft)] text-[var(--shu)]',
  },
  {
    label: '换谷匹配',
    href: '/matches',
    note: '看看谁与你双向合拍',
    mark: '⇄',
    tone: 'bg-[var(--violet-soft)] text-[var(--violet)]',
  },
];

export function HomeIndexSection() {
  return (
    <section className="py-16">
      <div className="min-w-0">
        <p className="section-kicker">快速入口</p>
        <h2 className="mt-3 text-[clamp(28px,3.4vw,40px)]">按类型逛谷</h2>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {goodsTypes.map((type, index) => (
            <Link
              className="panel-float group flex min-h-[104px] flex-col justify-between rounded-[18px] border border-[var(--rule)] bg-[var(--surface)] p-4 text-[14px]"
              href={`/search?goodsType=${encodeURIComponent(type)}`}
              key={type}
            >
              <span className="font-mono text-[11px] text-[var(--shu)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="font-semibold transition-colors group-hover:text-[var(--shu)]">
                {formatGoodsTypeLabel(type)}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-14">
          <h3 className="text-[22px]">接下来想做什么？</h3>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {entries.map((entry) => (
              <Link
                className="panel-float group flex items-center gap-4 rounded-[20px] border border-[var(--rule)] bg-[var(--surface)] p-5"
                href={entry.href}
                key={entry.href}
              >
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-[15px] text-xl font-bold ${entry.tone}`}
                >
                  {entry.mark}
                </span>
                <span className="min-w-0">
                  <span className="font-heading block text-[16px] font-bold transition-colors group-hover:text-[var(--shu)]">
                    {entry.label}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-[12px]">
                    {entry.note}
                  </span>
                </span>
                <span className="ml-auto text-[var(--shu)]">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
