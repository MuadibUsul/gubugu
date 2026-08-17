import Link from 'next/link';

import { SlotStrip } from '@/components/collection/slot-strip';
import type { CharacterEncyclopediaViewData } from '@/server/data';

type CharacterSheetHeaderProps = {
  data: CharacterEncyclopediaViewData;
  viewerLabel: string;
};

/**
 * 収集帖的表头。
 *
 * 旧页面把「商品视图 / 进度视图」做成两个标签互相切换 —— 那是让结构跟自己
 * 打架：一张收集表上，进度就是表头，条目就是表身，本来是一件事。这里把它
 * 合回一页：先看见缺口，再看见条目。
 */
export function CharacterSheetHeader({
  data,
  viewerLabel,
}: CharacterSheetHeaderProps) {
  const { character, series } = data.completion;
  const remaining = character.remainingGoods;

  return (
    <section className="spread border-border border-b pb-14">
      <div>
        <p className="lbl">収集帖</p>
        <div className="rail-jp">収集</div>
      </div>

      <div className="min-w-0">
        <p className="accession">
          <Link
            className="hover:text-[var(--shu)]"
            href={`/ips/${data.ip.slug}`}
          >
            {data.ip.name}
          </Link>
          <i> · 全 {character.totalGoods} 件</i>
        </p>

        <h1 className="mt-2 text-[clamp(30px,4vw,46px)] leading-[1.14]">
          {data.character.name}
        </h1>
        <div className="rule-kin mt-4" />

        {remaining > 0 ? (
          <p className="gap-callout mt-5">
            还差 <b>{remaining}</b> 件补全这位角色。
          </p>
        ) : character.totalGoods > 0 ? (
          <p className="gap-callout mt-5">
            这位角色<b>已经补全</b>。
          </p>
        ) : null}

        <div className="mt-5">
          <SlotStrip
            label={`已收录 ${character.ownedGoods} 件，共 ${character.totalGoods} 件`}
            owned={character.ownedGoods}
            total={character.totalGoods}
          />
          <p className="lbl mt-2">实心为已收录。空格是还没找到的那几件。</p>
        </div>

        {series.length > 0 ? (
          <div className="mt-10">
            <p className="lbl mb-1">按系列</p>
            {series.map((item) => (
              <div className="series-row" key={item.id}>
                <span className="series-row__name">{item.name}</span>
                <SlotStrip owned={item.ownedGoods} total={item.totalGoods} />
                <span className="series-row__count">
                  {item.ownedGoods} / {item.totalGoods}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <p className="lbl mt-8">当前身份 · {viewerLabel}</p>
      </div>
    </section>
  );
}
