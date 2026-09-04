import Link from 'next/link';

// 移动端顶栏（对齐设计稿「首页」头部）：左品牌印、居中搜索 pill、右通知铃。
// `lg:hidden`——宽屏用 DesktopNav。（此前注释写着 md:hidden 但类名里没有，桌面
// 上会和顶部导航叠一起。）搜索做成可点的
// pill 直接跳 /search，不在顶栏里塞输入态——和设计稿一致，输入交给谷库页。

const searchIcon = (
  <svg width="15" height="15" viewBox="0 0 256 256" fill="var(--ink-3)">
    <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
  </svg>
);

// 品牌印：朱红圆底 + 古铜金描边，中置象牙色月牙与一枚金星，取自设计稿。
export function BrandSeal({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="var(--shu)"
        stroke="var(--kin)"
        strokeWidth="1.6"
      />
      <path
        d="M20.6 8.4a8.2 8.2 0 100 15.2 9.4 9.4 0 010-15.2Z"
        fill="var(--paper)"
      />
      <path
        d="M11.4 12.6l1.1 2.6 2.6 1.1-2.6 1.1-1.1 2.6-1.1-2.6L7.7 16.3l2.6-1.1Z"
        fill="var(--kin)"
      />
    </svg>
  );
}

type MobileAppHeaderProps = {
  /** 搜索 pill 里的占位提示。 */
  searchPlaceholder?: string;
  /** 是否在铃铛上显示未读小红点。 */
  hasUnread?: boolean;
};

export function MobileAppHeader({
  searchPlaceholder = '搜角色、系列、SKU',
  hasUnread = true,
}: MobileAppHeaderProps) {
  return (
    <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2.5 border-b border-[var(--rule-2)] bg-[var(--paper)] px-4 py-2.5 sm:-mx-6 sm:px-6 lg:hidden">
      <BrandSeal />
      <Link
        aria-label="搜索"
        href="/search"
        className="flex flex-1 items-center gap-2 rounded-[10px] border border-[var(--rule)] bg-[var(--surface)] px-3 py-2"
      >
        {searchIcon}
        <span className="text-[12.5px] text-[var(--ink-3)]">
          {searchPlaceholder}
        </span>
      </Link>
      <Link
        aria-label="通知"
        href="/me/notifications"
        className="relative flex-none text-[var(--ink-2)]"
      >
        <svg width="21" height="21" viewBox="0 0 256 256" fill="currentColor">
          <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z" />
        </svg>
        {hasUnread ? (
          <span className="absolute top-0 right-0 size-1.5 rounded-full bg-[var(--shu)]" />
        ) : null}
      </Link>
    </div>
  );
}
