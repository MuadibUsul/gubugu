'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

const searchSuggestions = [
  '亚克力立牌',
  '徽章',
  '迷你色纸',
  '春日主题',
  '双人图',
  'Aoi Tsukishiro',
  'Kaito Asagiri',
  'Ren Kagetsu',
  'Winter Archive',
  'Spring Bloom',
] as const;

export function HomePrimarySearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <input
          autoComplete="off"
          className="ui-field-lg h-16 px-5 text-lg"
          id="home-search-query"
          name="query"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit(query);
            }
          }}
          placeholder="角色名、系列名、SKU 编号"
          ref={inputRef}
          type="search"
          value={query}
        />
        <Button
          className="h-16 rounded-[var(--radius)] px-8 text-base"
          onClick={() => submit(query)}
          size="lg"
          type="button"
        >
          立即搜索
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            className="hud-chip panel-float text-foreground/86 px-3 py-1.5 text-sm"
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
