'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}

export default function StarPicker({ value, onChange, disabled = false }: Props) {
  const [hovered, setHovered] = useState(0);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(index);
    }
    if (e.key === 'ArrowRight' && index < 5) onChange(index + 1);
    if (e.key === 'ArrowLeft' && index > 1) onChange(index - 1);
  }

  return (
    <div
      role="group"
      aria-label="Puntuación con estrellas"
      className="flex gap-1"
      onMouseLeave={() => setHovered(0)}
    >
      {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
            disabled={disabled}
            className={cn(
              'h-11 w-11 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:w-9',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            )}
            onMouseEnter={() => !disabled && setHovered(star)}
            onClick={() => !disabled && onChange(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
          >
            <Star
              className={cn(
                'h-7 w-7 transition-colors md:h-6 md:w-6',
                filled
                  ? 'fill-primary text-primary'
                  : 'fill-none text-muted-foreground',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
