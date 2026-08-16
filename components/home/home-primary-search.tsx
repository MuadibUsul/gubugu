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
      <div className="border-input flex border focus-within:border-[var(--shu)]">
        <input
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[15px] focus-visible:shadow-none"
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
          className="shrink-0 bg-[var(--shu)] px-6 text-[14px] font-medium text-[var(--shu-ink)]"
          onClick={() => submit(query)}
          type="button"
        >
          搜索
        </button>
      </div>

      {/* 建议词排成一行文字，不是一排胶囊 —— 索引的做法 */}
      <div className="text-muted-foreground mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
        <span className="lbl">试试</span>
        {suggestions.map((item) => (
          <button
            className="underline-offset-4 hover:text-[var(--shu)] hover:underline"
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
