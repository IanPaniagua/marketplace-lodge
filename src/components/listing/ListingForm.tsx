'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ListingFieldsSchema, type ListingFieldsInput } from '@/lib/schemas';
import { compressToWebp } from '@/lib/image';
import { insforge } from '@/lib/insforge';
import {
  createListingRecord,
  saveListingPhotos,
  updateListingRecord,
  deleteListingPhotos,
  reorderListingPhotos,
  saveListingPhotos as appendListingPhotos,
} from '@/app/(app)/listings/actions';
import PhotoUpload, { type ExistingPhoto, type NewPhoto, type PhotoEntry } from './PhotoUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const CATEGORIES = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books' },
  { value: 'clothes', label: 'Clothes' },
  { value: 'other', label: 'Other' },
] as const;

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'used', label: 'Used' },
  { value: 'worn', label: 'Worn' },
] as const;

interface Props {
  mode: 'create' | 'edit';
  listingId?: string;
  defaultValues?: Partial<ListingFieldsInput>;
  existingPhotos?: ExistingPhoto[];
}

export default function ListingForm({
  mode,
  listingId,
  defaultValues,
  existingPhotos = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<PhotoEntry[]>(existingPhotos);
  const [priceStr, setPriceStr] = useState<string>(
    defaultValues?.price_eur != null ? String(defaultValues.price_eur) : '',
  );

  const form = useForm<ListingFieldsInput>({
    resolver: zodResolver(ListingFieldsSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      category: defaultValues?.category ?? 'other',
      condition: defaultValues?.condition ?? 'used',
      is_gift: defaultValues?.is_gift ?? false,
      price_eur: defaultValues?.price_eur ?? null,
    },
  });

  const isGift = form.watch('is_gift');

  async function uploadNewPhotos(
    newPhotos: NewPhoto[],
    listingIdToUse: string,
  ): Promise<string[]> {
    const paths: string[] = [];
    for (const photo of newPhotos) {
      const compressed = await compressToWebp(photo.file);
      const path = `listings/${listingIdToUse}/${crypto.randomUUID()}.webp`;
      const { error } = await insforge.storage
        .from('listing-photos')
        .upload(path, compressed);
      if (error) throw new Error('Photo upload failed');
      paths.push(path);
    }
    return paths;
  }

  async function notifyAdmin(id: string) {
    await fetch('/api/notify-new-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: id }),
    });
  }

  function onSubmit(values: ListingFieldsInput) {
    if (photos.length === 0) {
      toast.error('Add at least one photo.');
      return;
    }

    startTransition(async () => {
      try {
        if (mode === 'create') {
          const { data, error } = await createListingRecord(values);
          if (error || !data) { toast.error(error ?? 'Failed to create listing'); return; }

          const newPhotos = photos.filter((p): p is NewPhoto => p.type === 'new');
          const paths = await uploadNewPhotos(newPhotos, data.listingId);
          const { error: photoErr } = await saveListingPhotos(data.listingId, paths);
          if (photoErr) { toast.error(photoErr); return; }

          await notifyAdmin(data.listingId);
          toast.success('Listing submitted for review.');
          router.push(`/listings/${data.listingId}`);
        } else {
          if (!listingId) return;

          const existingOriginalIds = existingPhotos.map((p) => p.id);
          const remainingExisting = photos.filter(
            (p): p is ExistingPhoto => p.type === 'existing',
          );
          const removedIds = existingOriginalIds.filter(
            (id) => !remainingExisting.find((p) => p.id === id),
          );
          const newPhotos = photos.filter((p): p is NewPhoto => p.type === 'new');
          const photosChanged = removedIds.length > 0 || newPhotos.length > 0;

          const { error: updateErr } = await updateListingRecord(
            listingId,
            values,
            photosChanged,
          );
          if (updateErr) { toast.error(updateErr); return; }

          if (removedIds.length > 0) {
            await deleteListingPhotos(removedIds);
          }

          if (newPhotos.length > 0) {
            const newPaths = await uploadNewPhotos(newPhotos, listingId);
            const offset = remainingExisting.length;
            const newPhotoRows = newPaths.map((path) => path);
            await appendListingPhotos(listingId, newPhotoRows);
            void offset; // sort_order handled below
          }

          // Reorder all remaining existing photos according to current order
          const reorderItems = remainingExisting.map((p, i) => ({
            id: p.id,
            sort_order: i,
          }));
          if (reorderItems.length > 0) {
            await reorderListingPhotos(reorderItems);
          }

          if (photosChanged) await notifyAdmin(listingId);
          toast.success('Listing updated.');
          router.push(`/listings/${listingId}`);
        }
      } catch (err) {
        toast.error('Something went wrong. Try again.');
        console.error(err);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Photos */}
        <div className="space-y-2">
          <Label>Photos <span className="text-destructive">*</span></Label>
          <PhotoUpload
            photos={photos}
            onChange={setPhotos}
          />
        </div>

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="What are you selling?" className="h-11 md:h-10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe the item — condition, size, reason for selling…"
                  rows={4}
                  maxLength={2000}
                  className="resize-none"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {(field.value ?? '').length}/2000
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      field.value === value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Condition */}
        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      field.value === value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price / Free toggle */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Pricing</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isGift}
                onClick={() => {
                  const next = !isGift;
                  form.setValue('is_gift', next);
                  if (next) {
                    form.setValue('price_eur', null);
                    setPriceStr('');
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  isGift ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    isGift ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-sm font-medium">Give away for free</span>
            </div>
          </div>

          {!isGift && (
            <FormField
              control={form.control}
              name="price_eur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (€)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        €
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        className="h-11 pl-7 md:h-10"
                        value={priceStr}
                        onChange={(e) => {
                          setPriceStr(e.target.value);
                          const num = parseFloat(e.target.value);
                          field.onChange(isNaN(num) ? null : num);
                        }}
                        onBlur={field.onBlur}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto"
          disabled={isPending}
        >
          {isPending
            ? mode === 'create'
              ? 'Submitting…'
              : 'Saving…'
            : mode === 'create'
              ? 'Submit listing'
              : 'Save changes'}
        </Button>
      </form>
    </Form>
  );
}
