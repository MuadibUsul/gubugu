import Link from 'next/link';

import type { CharacterEncyclopediaViewData } from '@/server/data';

import {
  buildCharacterEncyclopediaHref,
  formatGoodsTypeLabel,
  type CharacterPageControls,
} from './character-query';

type CharacterSheetFiltersProps = {
  data: CharacterEncyclopediaViewData;
  controls: CharacterPageControls;
};

/**
 * 筛选排成几行文字，不是几组带框的芯片墙。
 *
 * 收藏者在这一页最常做的动作是查漏，所以「只看还没有的」提到第一位、独占
 * 一行，其余维度按索引的方式往下排。
 */
function FilterLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b py-2.5">
      <span className="lbl w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function FilterLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className={
        active
          ? 'text-[14px] font-medium text-[var(--shu)] underline underline-offset-4'
          : 'text-muted-foreground hover:text-foreground text-[14px]'
      }
      href={href}
    >
      {children}
    </Link>
  );
}

export function CharacterSheetFilters({
  data,
  controls,
}: CharacterSheetFiltersProps) {
  const { filters } = data;

  return (
    <div className="mb-10">
      {/* 查漏是这一页的主要动作，给它独立一行。
          此前这里只有「只看已收录」—— 那把缺口藏了起来，而整页的立论正是
          缺口驱动收集。缺什么现在排在第一位，已收录退到它后面。 */}
      <div className="border-border flex flex-wrap items-baseline gap-x-5 border-b py-3">
        <FilterLink
          active={controls.collected === 'missing'}
          href={buildCharacterEncyclopediaHref({
            ...controls,
            collected: controls.collected === 'missing' ? undefined : 'missing',
          })}
        >
          {controls.collected === 'missing' ? '✓ 只看还没有的' : '只看还没有的'}
        </FilterLink>
        <FilterLink
          active={controls.collected === 'owned'}
          href={buildCharacterEncyclopediaHref({
            ...controls,
            collected: controls.collected === 'owned' ? undefined : 'owned',
          })}
        >
          {controls.collected === 'owned' ? '✓ 只看已收录' : '只看已收录'}
        </FilterLink>
        <FilterLink
          active={false}
          href={buildCharacterEncyclopediaHref({
            ipSlug: controls.ipSlug,
            characterSlug: controls.characterSlug,
            view: controls.view,
            viewer: controls.viewer,
            tagSlugs: [],
          })}
        >
          清除全部筛选
        </FilterLink>
      </div>

      {filters.series.length > 0 ? (
        <FilterLine label="系列">
          {filters.series.map((item) => (
            <FilterLink
              active={controls.seriesSlug === item.slug}
              href={buildCharacterEncyclopediaHref({
                ...controls,
                seriesSlug:
                  controls.seriesSlug === item.slug ? undefined : item.slug,
              })}
              key={item.id}
            >
              {item.name}
              <span className="num ml-1.5">{item.goodsCount}</span>
            </FilterLink>
          ))}
        </FilterLine>
      ) : null}

      {filters.goodsTypes.length > 0 ? (
        <FilterLine label="类型">
          {filters.goodsTypes.map((item) => (
            <FilterLink
              active={controls.goodsType === item.value}
              href={buildCharacterEncyclopediaHref({
                ...controls,
                goodsType:
                  controls.goodsType === item.value ? undefined : item.value,
              })}
              key={item.value}
            >
              {formatGoodsTypeLabel(item.value)}
              <span className="num ml-1.5">{item.goodsCount}</span>
            </FilterLink>
          ))}
        </FilterLine>
      ) : null}

      {filters.tags.length > 0 ? (
        <FilterLine label="标签">
          {filters.tags.slice(0, 14).map((tag) => {
            const active = controls.tagSlugs.includes(tag.slug);

            return (
              <FilterLink
                active={active}
                href={buildCharacterEncyclopediaHref({
                  ...controls,
                  tagSlugs: active
                    ? controls.tagSlugs.filter((slug) => slug !== tag.slug)
                    : [...controls.tagSlugs, tag.slug],
                })}
                key={tag.id}
              >
                {tag.name}
                <span className="num ml-1.5">{tag.goodsCount}</span>
              </FilterLink>
            );
          })}
        </FilterLine>
      ) : null}
    </div>
  );
}
