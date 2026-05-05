'use client';

import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

import { ProfileEditSchema, type ProfileEditInput } from '@/lib/schemas';
import { updateProfile, updateAvatarUrl } from '@/app/(app)/profile/actions';
import { insforge } from '@/lib/insforge';
import { compressToWebp } from '@/lib/image';
import type { Profile } from '@/types/db';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';


interface Props {
  profile: Profile;
}

export default function ProfileEditForm({ profile }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileEditInput>({
    resolver: zodResolver(ProfileEditSchema),
    defaultValues: {
      display_name: profile.display_name,
      bio: profile.bio ?? '',
      room_number: profile.room_number ?? '',
    },
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const compressed = await compressToWebp(file);
      const path = `avatars/${profile.id}.webp`;

      const { error: uploadError } = await insforge.storage
        .from('listing-photos')
        .upload(path, compressed);

      if (uploadError) {
        toast.error('Failed to upload avatar.');
        return;
      }

      const publicUrl = insforge.storage
        .from('listing-photos')
        .getPublicUrl(path);

      const { error } = await updateAvatarUrl(publicUrl);
      if (error) {
        toast.error(error);
        return;
      }

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success('Avatar updated.');
    } catch {
      toast.error('Something went wrong uploading the avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function onSubmit(values: ProfileEditInput) {
    startTransition(async () => {
      const { error } = await updateProfile(values);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Profile saved.');
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar className="h-20 w-20">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.display_name} />}
            <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
              {profile.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
            aria-label="Change avatar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        {uploadingAvatar && (
          <p className="text-xs text-muted-foreground">Uploading…</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Your name"
                    className="h-11 md:h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="A short introduction (max 200 characters)"
                    maxLength={200}
                    rows={3}
                    className="resize-none"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {(field.value ?? '').length}/200
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="room_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Room number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. 14"
                    className="h-11 md:h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto"
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
