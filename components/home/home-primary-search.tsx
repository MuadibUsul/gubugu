'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

const searchSuggestions = [
  '亚克力立牌',
  '徽章',
  '迷你色纸',
  '春日主题',
  'Aoi Tsukishiro',
  'Ren Kagetsu',
] as const;

export function HomePrimarySearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');

  // 不做挂载时 autofocus：首页一打开就抢焦点，移动端会把页面直接滚到输入框，
  // 用户还没读到这是什么就被推到了操作上。

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return searchSuggestions.slice(0, 5);
    }

    return searchSuggestions
      .filter((item) => item.toLowerCase().includes(normalized))
      .slice(0, 5);
  }, [query]);

  function submit(nextQuery: string) {
    const normalized = nextQuery.trim();

    if (!normalized) {
      inputRef.current?.focus();
      return;
    }

    router.push(`/search?query=${encodeURIComponent(normalized)}`);
  }

  return (
    <div>
      <div className="flex rounded-[18px] border border-[var(--rule)] bg-[var(--surface)] p-1.5 shadow-[0_14px_36px_-28px_var(--ink)] focus-within:border-[var(--shu)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--shu)_13%,transparent)]">
        <input
          aria-label="搜索谷子"
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-[15px] focus-visible:shadow-none sm:px-4"
          name="query"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit(query);
            }
          }}
          placeholder="商品名、型号，或者角色名"
          ref={inputRef}
          type="search"
          value={query}
        />
        <button
          className="shrink-0 rounded-[13px] bg-[linear-gradient(135deg,var(--shu),color-mix(in_oklab,var(--shu)_66%,var(--violet)))] px-5 text-[14px] font-bold text-white shadow-[0_10px_24px_-14px_var(--shu)] sm:px-6"
          onClick={() => submit(query)}
          type="button"
        >
          搜索 <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="mr-1 font-semibold">热门：</span>
        {suggestions.map((item) => (
          <button
            className="rounded-full bg-[var(--surface)]/78 px-2.5 py-1 hover:bg-[var(--shu-soft)] hover:text-[var(--shu)]"
            key={item}
            onClick={() => submit(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
