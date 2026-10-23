'use client';

import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

import { ProfileEditSchema, type ProfileEditInput } from '@/lib/schemas';
import { updateProfile, updateAvatarUrl } from '@/app/(app)/profile/actions';
import { insforge } from '@/lib/insforge';
import type { Profile } from '@/types/db';
import AvatarCropModal from '@/components/profile/AvatarCropModal';

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
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const form = useForm<ProfileEditInput>({
    resolver: zodResolver(ProfileEditSchema),
    defaultValues: {
      display_name: profile.display_name,
      bio: profile.bio ?? '',
    },
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected after cancel
    e.target.value = '';
    const reader = new FileReader();
    reader.addEventListener('load', () => setCropSrc(reader.result as string));
    reader.readAsDataURL(file);
  }

  async function handleCropped(croppedFile: File) {
    setCropSrc(null);
    setUploadingAvatar(true);
    try {
      // Use a timestamped path so each upload is a fresh URL — avoids
      // both "file already exists" errors and CDN cache serving old content.
      const path = `avatars/${profile.id}-${Date.now()}.webp`;

      const fd = new FormData();
      fd.append('file', croppedFile, 'avatar.webp');
      fd.append('path', path);
      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });

      if (!uploadRes.ok) {
        toast.error('No se pudo subir la foto. Inténtalo de nuevo.');
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

      setAvatarUrl(publicUrl);
      toast.success('Foto de perfil actualizada.');
    } catch (err) {
      console.error('[avatar upload]', err);
      toast.error('Ha ocurrido un error al subir la foto.');
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
        toast.success('Perfil guardado.');
      }
    });
  }

  return (
    <div className="space-y-8">
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          open={true}
          onClose={() => setCropSrc(null)}
          onCropped={handleCropped}
        />
      )}

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
            aria-label="Cambiar foto de perfil"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        {uploadingAvatar && (
          <p className="text-xs text-muted-foreground">Subiendo…</p>
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
                <FormLabel>Nombre visible</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Tu nombre"
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
                <FormLabel>Presentación</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Una breve presentación (máximo 200 caracteres)"
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

          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto"
            disabled={isPending}
          >
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
