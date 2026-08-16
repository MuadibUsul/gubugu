import Link from 'next/link';

import { formatGoodsTypeLabel } from '@/components/search/search-query';

/**
 * 索引 —— 按类型的入口。
 *
 * 排成密排的文字索引，不是一行胶囊按钮。索引是书末那几页：一列列词条，靠
 * 密度和字号分层，不靠每个词条都套一个框。
 */
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
  { label: '拍照识别', href: '/recognition', note: '有实物，不知道名字' },
  { label: '我的收藏', href: '/me/collection', note: '看自己的补全度' },
  { label: '全部条目', href: '/search', note: '从头翻起' },
];

export function HomeIndexSection() {
  return (
    <section className="spread py-16">
      <div>
        <p className="lbl">索引</p>
        <div className="rail-jp">索引</div>
      </div>

      <div className="min-w-0">
        <h2 className="text-[26px]">按类型查阅</h2>
        <div className="rule-kin mt-3" />

        <div className="mt-6 columns-2 gap-x-10 sm:columns-3">
          {goodsTypes.map((type) => (
            <Link
              className="border-border mb-0 flex break-inside-avoid items-baseline justify-between gap-3 border-b py-2.5 text-[14px] hover:text-[var(--shu)]"
              href={`/search?goodsType=${encodeURIComponent(type)}`}
              key={type}
            >
              <span>{formatGoodsTypeLabel(type)}</span>
              <span className="num shrink-0">{type}</span>
            </Link>
          ))}
        </div>

        <div className="mt-12">
          <h3 className="text-[18px]">其他入口</h3>
          <div className="mt-3">
            {entries.map((entry) => (
              <Link
                className="border-border group flex items-baseline gap-4 border-b py-4 last:border-b-0"
                href={entry.href}
                key={entry.href}
              >
                <span className="font-heading text-[17px] font-semibold transition-colors group-hover:text-[var(--shu)]">
                  {entry.label}
                </span>
                <span
                  aria-hidden="true"
                  className="border-border mx-1 hidden min-w-6 flex-1 translate-y-[-4px] border-b border-dotted sm:block"
                />
                <span className="text-muted-foreground shrink-0 text-[13px]">
                  {entry.note}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
