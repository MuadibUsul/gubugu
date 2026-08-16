import { HomePrimarySearch } from '@/components/home/home-primary-search';

type HomeFrontispieceProps = {
  ipCount: number;
  goodsCount: number;
};

/**
 * 扉 —— 图录的第一页。
 *
 * 不是 hero banner：没有大图、没有并排的行动按钮组。一本图录的开篇给的是
 * 这本册子的身份、它收了多少东西，以及查阅的入口。
 */
export function HomeFrontispiece({
  ipCount,
  goodsCount,
}: HomeFrontispieceProps) {
  return (
    <section className="spread border-border border-b pb-16">
      <div>
        <p className="lbl">図鑑</p>
        <div className="rail-jp">谷布谷図鑑</div>
      </div>

      <div className="min-w-0">
        <h1 className="text-[clamp(34px,5vw,62px)] leading-[1.12] text-balance">
          每一件周边，
          <br />
          都值得一个准确的名字。
        </h1>

        <div className="rule-kin mt-6" />

        <div className="mt-6 flex flex-wrap items-baseline gap-x-10 gap-y-3">
          <span className="accession">
            <b>{goodsCount}</b> <i>件已收录</i>
          </span>
          <span className="accession">
            <b>{ipCount}</b> <i>部作品</i>
          </span>
        </div>

        <p className="text-muted-foreground mt-6 max-w-[54ch]">
          从作品到角色，从系列到具体型号。找到它，再决定要不要把它收进来。
        </p>

        <div className="mt-8 max-w-[540px]">
          <HomePrimarySearch />
        </div>
      </div>
    </section>
  );
}
