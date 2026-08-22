import Link from 'next/link';

import {
  formatGoodsTypeLabel,
  formatMaterialLabel,
  formatTagLabel,
} from '@/lib/catalog-labels';
import { formatCatalogDate } from '@/lib/formatters';
import type { GoodsDetailPageData } from '@/server/data';

type GoodsSpecTableProps = {
  goods: GoodsDetailPageData;
};

/**
 * 解説 —— 条目的属性表。
 *
 * 旧版把这些拆成四五个带标题的面板卡纵向堆着，读者要在方块之间跳。图录的
 * 做法是一张表：左栏字段名、右栏值，一眼扫完。
 */
export function GoodsSpecTable({ goods }: GoodsSpecTableProps) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: '作品',
      value: (
        <Link
          className="hover:text-[var(--shu)]"
          href={`/ips/${goods.ip.slug}`}
        >
          {goods.ip.name}
        </Link>
      ),
    },
    {
      label: '系列',
      value: (
        <Link
          className="hover:text-[var(--shu)]"
          href={`/ips/${goods.ip.slug}/series/${goods.series.slug}`}
        >
          {goods.series.name}
        </Link>
      ),
    },
    {
      label: '角色',
      value:
        goods.characters.length > 0
          ? goods.characters.map((character, index) => (
              <span key={character.id}>
                {index > 0 ? '、' : ''}
                <Link
                  className="hover:text-[var(--shu)]"
                  href={`/ips/${goods.ip.slug}/characters/${character.slug}`}
                >
                  {character.name}
                </Link>
              </span>
            ))
          : '暂未关联',
    },
    { label: '类型', value: formatGoodsTypeLabel(goods.goodsType) },
    { label: '材质', value: formatMaterialLabel(goods.material) },
    { label: '尺寸', value: goods.sizeLabel ?? '暂未收录' },
    { label: '版本', value: goods.edition ?? '暂未收录' },
    { label: '发售', value: formatCatalogDate(goods.releaseDate) },
  ];

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="spec-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {goods.tags.length > 0 ? (
        <div className="text-muted-foreground mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
          <span className="lbl">标签</span>
          {goods.tags.map((tag) => (
            <Link
              className="hover:text-[var(--shu)]"
              href={`/search?tag=${encodeURIComponent(tag.slug)}`}
              key={tag.id}
            >
              {formatTagLabel(tag.slug, tag.name)}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
