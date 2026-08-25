import { type Column, sql } from 'drizzle-orm';

/**
 * 「有日期的按新到旧在前，无日期的垫底」排序片段。
 *
 * Postgres 的 `DESC` 默认是 `NULLS FIRST`——于是没有发售日的记录（目录里占绝大多数）会
 * 霸占前排，把带日期的新采集内容挤到最后一页（曾出现新发布的原神谷子排到 304 件里第 303
 * 位、谷库首页根本看不到）。用 `DESC NULLS LAST` 纠正：按发售日新到旧排，缺日期的排末尾。
 */
export function descNullsLast(column: Column) {
  return sql`${column} desc nulls last`;
}
