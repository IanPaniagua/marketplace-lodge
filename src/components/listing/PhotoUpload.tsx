'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, GripVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExistingPhoto = {
  type: 'existing';
  id: string;
  path: string;
  url: string;
};

export type NewPhoto = {
  type: 'new';
  tempId: string;
  file: File;
  preview: string;
};

export type PhotoEntry = ExistingPhoto | NewPhoto;

interface Props {
  photos: PhotoEntry[];
  onChange: (photos: PhotoEntry[]) => void;
  maxPhotos?: number;
}

export default function PhotoUpload({ photos, onChange, maxPhotos = 5 }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const addFiles = useCallback(
    (files: FileList) => {
      const remaining = maxPhotos - photos.length;
      if (remaining <= 0) return;
      const accepted = Array.from(files)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, remaining);

      const newEntries: NewPhoto[] = accepted.map((file) => ({
        type: 'new',
        tempId: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }));

      onChange([...photos, ...newEntries]);
    },
    [photos, onChange, maxPhotos],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  }

  function remove(index: number) {
    const next = [...photos];
    const removed = next.splice(index, 1)[0];
    if (removed.type === 'new') URL.revokeObjectURL(removed.preview);
    onChange(next);
  }

  function onDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function onDragEnter(index: number) {
    setDragOver(index);
  }

  function onDrop(targetIndex: number) {
    const sourceIndex = dragIndexRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) return;
    const next = [...photos];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    dragIndexRef.current = null;
    setDragOver(null);
  }

  function onDragEnd() {
    dragIndexRef.current = null;
    setDragOver(null);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((photo, index) => {
          const src = photo.type === 'existing' ? photo.url : photo.preview;
          return (
            <div
              key={photo.type === 'existing' ? photo.id : photo.tempId}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragEnter={() => onDragEnter(index)}
              onDrop={() => onDrop(index)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={onDragEnd}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-opacity',
                dragOver === index && 'opacity-50',
              )}
            >
              <Image src={src} alt={`Foto ${index + 1}`} fill className="object-cover" />
              {/* Sort handle */}
              <div className="absolute left-1 top-1 cursor-grab rounded bg-black/40 p-0.5 opacity-0 group-hover:opacity-100">
                <GripVertical className="h-3 w-3 text-white" />
              </div>
              {/* Remove */}
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Eliminar foto"
              >
                <X className="h-3 w-3" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  Portada
                </span>
              )}
            </div>
          );
        })}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px]">Añadir</span>
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {photos.length}/{maxPhotos} fotos · Arrastra para ordenar · La primera será la portada
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
