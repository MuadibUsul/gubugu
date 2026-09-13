'use client';

import { useMemo, useState } from 'react';

import { BrandMark } from '@/components/brand/brand-mark';
import { HoloCard } from '@/components/collection/holo-card';
import {
  collectionPreviewGoods,
  filterPreviewGoods,
  previewGoods,
  statusLabel,
  type PreviewGoods,
  type PreviewStatus,
} from '@/lib/design-preview';

import styles from './design-preview.module.css';

type PreviewView = 'brand' | 'library' | 'collection' | 'detail';
type PreviewTheme = 'light' | 'dark';

const views: Array<{ id: PreviewView; label: string }> = [
  { id: 'brand', label: '品牌基准' },
  { id: 'library', label: '谷库' },
  { id: 'collection', label: '谷柜' },
  { id: 'detail', label: '藏品详情' },
];

const searchIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

function PreviewHeader({ view }: { view: PreviewView }) {
  return (
    <header className={styles.appHeader}>
      <BrandMark className={styles.brand} size={34} wordmark />
      <button className={styles.headerSearch} type="button">
        {searchIcon}
        <span>搜角色、系列、SKU</span>
      </button>
      <button
        aria-label="通知（无未读）"
        className={styles.iconButton}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      </button>
      <p className={styles.desktopContext}>
        {views.find((item) => item.id === view)?.label}
      </p>
    </header>
  );
}

function StatusPill({ status }: { status: PreviewStatus }) {
  return (
    <span className={styles.status} data-status={status}>
      {statusLabel[status]}
    </span>
  );
}

function GoodsCard({ item }: { item: PreviewGoods }) {
  const [failed, setFailed] = useState(false);
  return (
    <article className={styles.goodsCard}>
      <button className={styles.artButton} type="button">
        <span className={styles.art} data-shape={item.shape ?? 'portrait'}>
          {!failed ? (
            // Static sample assets deliberately exercise portrait, landscape and error states.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={item.name}
              decoding="async"
              loading="lazy"
              onError={() => setFailed(true)}
              src={item.imageUrl}
            />
          ) : (
            <span
              className={styles.imageFallback}
              role="img"
              aria-label="图片加载失败"
            >
              <BrandMark size={40} />
              <strong>图片暂时无法加载</strong>
              <small>仍可查看资料或稍后重试</small>
            </span>
          )}
        </span>
      </button>
      <div className={styles.cardBody}>
        <h3>{item.name}</h3>
        <p>{item.meta}</p>
        <div className={styles.cardFooter}>
          <StatusPill status={item.status} />
          <button
            aria-label={`打开${item.name}`}
            className={styles.roundAction}
            type="button"
          >
            →
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className={styles.empty}>
      <BrandMark size={44} />
      <strong>{children}</strong>
      <span>调整筛选条件后再试试</span>
    </div>
  );
}

function LibraryPreview() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('全部');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const items = useMemo(
    () => filterPreviewGoods(previewGoods, query, type),
    [query, type],
  );
  const filterPanel = (
    <div className={styles.filterBody}>
      <div className={styles.sheetHandle} aria-hidden="true" />
      <div className={styles.filterHeading}>
        <div>
          <span>筛选谷库</span>
          <small>选择一个类型，可随时清除</small>
        </div>
        <button
          aria-label="关闭筛选"
          className={styles.iconButton}
          onClick={() => setFiltersOpen(false)}
          type="button"
        >
          ×
        </button>
      </div>
      <fieldset>
        <legend>谷子类型</legend>
        <div className={styles.optionGrid}>
          {['全部', '卡片', '色纸', '徽章'].map((option) => (
            <button
              aria-pressed={type === option}
              data-selected={type === option}
              key={option}
              onClick={() => setType(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>图鉴关系</legend>
        <div className={styles.relationList}>
          <button type="button">
            IP <span>崩坏：星穹铁道</span>
          </button>
          <button type="button">
            角色 <span>全部角色</span>
          </button>
          <button type="button">
            系列 <span>全部系列</span>
          </button>
        </div>
      </fieldset>
      <button
        className={styles.primaryButton}
        onClick={() => setFiltersOpen(false)}
        type="button"
      >
        查看 {items.length} 件谷子
      </button>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.libraryHead}>
        <div>
          <p className={styles.eyebrow}>公共图鉴</p>
          <h1>谷库</h1>
        </div>
        <span className={styles.resultCount}>{items.length} 件</span>
      </div>
      <div className={styles.searchField} role="search">
        {searchIcon}
        <input
          aria-label="搜索谷子"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="商品名、系列或角色名"
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="清除搜索"
            onClick={() => setQuery('')}
            type="button"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className={styles.quickFilters} aria-label="快速筛选">
        {['全部', '卡片', '色纸', '徽章'].map((option) => (
          <button
            aria-pressed={type === option}
            data-selected={type === option}
            key={option}
            onClick={() => setType(option)}
            type="button"
          >
            {option}
          </button>
        ))}
        <button
          className={styles.filterTrigger}
          onClick={() => setFiltersOpen(true)}
          type="button"
        >
          筛选 <span>{type === '全部' ? '' : '1'}</span>
        </button>
      </div>
      <div className={styles.libraryLayout}>
        <aside className={styles.desktopFilters}>{filterPanel}</aside>
        <section aria-live="polite">
          <div className={styles.sectionHeading}>
            <h2>
              {query
                ? `“${query}”的结果`
                : type === '全部'
                  ? '全部谷子'
                  : `${type}图鉴`}
            </h2>
            <span>按最近收录</span>
          </div>
          {items.length ? (
            <div className={styles.goodsGrid}>
              {items.map((item) => (
                <GoodsCard item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <EmptyState>没有匹配的谷子</EmptyState>
          )}
        </section>
      </div>
      {filtersOpen ? (
        <div
          className={styles.sheetBackdrop}
          role="presentation"
          onMouseDown={() => setFiltersOpen(false)}
        >
          <section
            aria-label="筛选谷库"
            aria-modal="true"
            className={styles.filterSheet}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            {filterPanel}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function CollectionPreview() {
  const tabs = ['已入柜', '已点亮', '想要', '可换', '实拍'];
  const [tab, setTab] = useState('已入柜');
  const items = collectionPreviewGoods(previewGoods, tab);
  return (
    <div className={styles.page}>
      <div className={styles.collectionHero}>
        <div>
          <p className={styles.eyebrow}>我的收藏</p>
          <h1>谷柜</h1>
          <p>每一种状态都有明确含义，实物识别才会点亮。</p>
        </div>
        <div className={styles.progressRing} aria-label="图鉴完成度 36%">
          <strong>36%</strong>
          <span>完成度</span>
        </div>
      </div>
      <div className={styles.collectionStats}>
        <span>
          <strong>28</strong> 已入柜
        </span>
        <span>
          <strong>9</strong> 已点亮
        </span>
        <span>
          <strong>6</strong> 想要
        </span>
      </div>
      <div className={styles.segmented} role="tablist" aria-label="谷柜视图">
        {tabs.map((item) => (
          <button
            aria-selected={tab === item}
            data-selected={tab === item}
            key={item}
            onClick={() => setTab(item)}
            role="tab"
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <div className={styles.sectionHeading}>
        <h2>{tab}</h2>
        <span>{items.length} 件样板</span>
      </div>
      {items.length ? (
        <div className={styles.goodsGrid}>
          {items.map((item) => (
            <GoodsCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <EmptyState>这个分类还没有藏品</EmptyState>
      )}
    </div>
  );
}

function DetailPreview() {
  const [statuses, setStatuses] = useState<PreviewStatus[]>(['owned', 'lit']);
  const toggle = (status: PreviewStatus) =>
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  return (
    <div className={`${styles.page} ${styles.detailPage}`}>
      <nav className={styles.breadcrumb} aria-label="面包屑">
        崩坏：星穹铁道 <span>/</span> 帕姆留影簿 <span>/</span> SKU
      </nav>
      <div className={styles.detailTitle}>
        <div>
          <p className={styles.eyebrow}>GBG-HSR-PLB-004</p>
          <h1>帕姆留影簿系列仿拍立得 第四弹 纪念收藏卡</h1>
        </div>
        <StatusPill status="lit" />
      </div>
      <div className={styles.detailGrid}>
        <div className={styles.cardStage}>
          <HoloCard
            alt="帕姆留影簿系列仿拍立得 第四弹"
            backSrc="/local-sample-images/guzi-sample-02.png"
            src="/local-sample-images/guzi-sample-01.png"
          />
          <p>拖动查看卡面 · 点按翻到背面</p>
        </div>
        <div className={styles.detailInfo}>
          <section className={styles.actionPanel}>
            <h2>收藏状态</h2>
            <p>“入柜”和“点亮”分开表达，点亮只来自实物识别。</p>
            <div className={styles.statusActions}>
              {(['owned', 'wanted', 'exchange'] as PreviewStatus[]).map(
                (status) => (
                  <button
                    aria-pressed={statuses.includes(status)}
                    data-selected={statuses.includes(status)}
                    data-status={status}
                    key={status}
                    onClick={() => toggle(status)}
                    type="button"
                  >
                    <span>
                      {status === 'owned'
                        ? '▣'
                        : status === 'wanted'
                          ? '♡'
                          : '⇄'}
                    </span>
                    {status === 'owned' ? '已入柜' : statusLabel[status]}
                  </button>
                ),
              )}
              <button type="button">
                <span>↗</span>分享
              </button>
            </div>
            <div className={styles.litNotice}>
              <span>✓</span>
              <div>
                <strong>已通过实物识别点亮</strong>
                <small>2026 年 9 月 13 日</small>
              </div>
            </div>
          </section>
          <section className={styles.specPanel}>
            <h2>藏品资料</h2>
            <dl>
              <div>
                <dt>作品</dt>
                <dd>崩坏：星穹铁道</dd>
              </div>
              <div>
                <dt>系列</dt>
                <dd>帕姆留影簿</dd>
              </div>
              <div>
                <dt>类型</dt>
                <dd>仿拍立得收藏卡</dd>
              </div>
              <div>
                <dt>尺寸</dt>
                <dd>约 63 × 89 mm</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
      <section className={styles.detailSections}>
        {[
          ['评分与收藏笔记', '4.8 综合评分 · 12 条真实体验'],
          ['收藏者实拍', '8 张社区图片 · 按 SKU 聚合'],
          ['换谷信息', '2 个可交换库存 · 1 个匹配意向'],
        ].map(([title, summary]) => (
          <details key={title}>
            <summary>
              <span>
                <strong>{title}</strong>
                <small>{summary}</small>
              </span>
              <b>＋</b>
            </summary>
            <p>
              样板保留该功能入口；推广阶段接回现有真实数据、表单、举报和权限逻辑。
            </p>
          </details>
        ))}
      </section>
    </div>
  );
}

function BrandPreview() {
  return (
    <div className={`${styles.page} ${styles.brandPage}`}>
      <section className={styles.brandHero}>
        <div>
          <p className={styles.eyebrow}>谷布谷 · GUBUGU</p>
          <h1>让收藏自己发光</h1>
          <p>现代、清晰、有收藏质感的个人图鉴 App</p>
        </div>
        <BrandMark className={styles.heroMark} size={70} wordmark />
      </section>
      <section>
        <div className={styles.sectionHeading}>
          <h2>视觉基准</h2>
          <span>第一版</span>
        </div>
        <div className={styles.swatches}>
          {[
            ['品牌朱红', '#B93C49'],
            ['收藏金', '#B0874F'],
            ['页面背景', '#F6F7F9'],
            ['卡片表面', '#FFFFFF'],
            ['正文', '#20242B'],
            ['次级文字', '#667085'],
          ].map(([name, color]) => (
            <div key={name}>
              <i style={{ background: color }} />
              <strong>{name}</strong>
              <code>{color}</code>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.principles}>
        <div>
          <span>01</span>
          <strong>藏品先于装饰</strong>
          <p>图片是视觉主角，界面提供稳定的层级与留白。</p>
        </div>
        <div>
          <span>02</span>
          <strong>状态必须可信</strong>
          <p>入柜、点亮、想要、可换同时依靠文字和颜色。</p>
        </div>
        <div>
          <span>03</span>
          <strong>反馈短而明确</strong>
          <p>常用操作在 120–220ms 内响应，键盘操作不等待动画。</p>
        </div>
      </section>
      <section className={styles.componentSample}>
        <div>
          <small>主要操作</small>
          <button className={styles.primaryButton} type="button">
            收进谷柜
          </button>
        </div>
        <div>
          <small>次要操作</small>
          <button className={styles.secondaryButton} type="button">
            查看资料
          </button>
        </div>
        <div>
          <small>状态语言</small>
          <div className={styles.statusRow}>
            <StatusPill status="lit" />
            <StatusPill status="wanted" />
            <StatusPill status="exchange" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function DesignPreview() {
  const [view, setView] = useState<PreviewView>('brand');
  const [theme, setTheme] = useState<PreviewTheme>('light');
  return (
    <main className={styles.preview} data-theme={theme}>
      <div className={styles.previewToolbar}>
        <div className={styles.previewIntro}>
          <span>UI / VI 内测样板</span>
          <small>不写入业务数据 · 不替换现有页面</small>
        </div>
        <div
          className={styles.previewTabs}
          role="tablist"
          aria-label="样板页面"
        >
          {views.map((item) => (
            <button
              aria-selected={view === item.id}
              key={item.id}
              onClick={() => setView(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          aria-label={theme === 'light' ? '切换到深色样板' : '切换到浅色样板'}
          className={styles.themeButton}
          onClick={() =>
            setTheme((value) => (value === 'light' ? 'dark' : 'light'))
          }
          type="button"
        >
          {theme === 'light' ? '深色' : '浅色'}
        </button>
      </div>
      <div className={styles.appFrame}>
        <PreviewHeader view={view} />
        {view === 'brand' ? <BrandPreview /> : null}
        {view === 'library' ? <LibraryPreview /> : null}
        {view === 'collection' ? <CollectionPreview /> : null}
        {view === 'detail' ? <DetailPreview /> : null}
      </div>
    </main>
  );
}
