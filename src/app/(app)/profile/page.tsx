import { getServerProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import RatingsList from '@/components/rating/RatingsList';
import ShareCatalogButton from '@/components/profile/ShareCatalogButton';
import InviteFriendsButton from '@/components/friends/InviteFriendsButton';

export const metadata = { title: 'Mi perfil — Lodge Market' };

export default async function ProfilePage() {
  const profile = await getServerProfile();
  if (!profile) redirect('/login');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Mi perfil
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <InviteFriendsButton
            displayName={profile.display_name}
            variant="outline"
            size="sm"
          />
          <ShareCatalogButton userId={profile.id} />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile/settings" className="flex items-center gap-1.5">
              <Settings className="h-4 w-4" />
              Ajustes
            </Link>
          </Button>
        </div>
      </div>

      <ProfileEditForm profile={profile} />

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Mis valoraciones</h2>
        <RatingsList
          rateeId={profile.id}
          rateeName={profile.display_name}
          currentUserId={profile.id}
        />
      </section>
    </div>
  );
}
