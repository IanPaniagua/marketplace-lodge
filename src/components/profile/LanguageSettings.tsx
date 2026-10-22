'use client';

import { Globe2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function LanguageSettings() {
  return (
    <div className="surface-card rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Globe2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <Label htmlFor="app-language">Idioma de la aplicación</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              El castellano es el idioma principal. El inglés se conserva como opción secundaria para más adelante.
            </p>
          </div>
          <select
            id="app-language"
            defaultValue="es"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            aria-label="Idioma de la aplicación"
          >
            <option value="es">Castellano</option>
            <option value="en" disabled>English · próximamente</option>
          </select>
        </div>
      </div>
    </div>
  );
}
