'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ListingCategory } from '@/types/db';

const CATEGORIES: { value: ListingCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'furniture', label: 'Muebles' },
  { value: 'kitchen', label: 'Cocina' },
  { value: 'electronics', label: 'Electrónica' },
  { value: 'books', label: 'Libros' },
  { value: 'clothes', label: 'Ropa' },
  { value: 'other', label: 'Otros' },
];

export default function FeedFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeCategory = searchParams.get('category') ?? 'all';
  const freeOnly = searchParams.get('free') === '1';

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-3">
      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => updateParam('category', value)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              activeCategory === value
                ? 'brand-gradient border-transparent text-primary-foreground shadow-sm shadow-primary/20'
                : 'border-border bg-background/80 text-foreground hover:border-primary/20 hover:bg-accent',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Free only toggle */}
      <Button
        variant={freeOnly ? 'default' : 'outline'}
        size="sm"
        onClick={() => updateParam('free', freeOnly ? null : '1')}
        className="h-8 rounded-full text-sm"
      >
        Solo gratis
      </Button>
    </div>
  );
}
