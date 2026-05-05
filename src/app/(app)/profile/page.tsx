import { getServerProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileEditForm from '@/components/profile/ProfileEditForm';

export const metadata = { title: 'My Profile — Lodge' };

export default async function ProfilePage() {
  const profile = await getServerProfile();
  if (!profile) redirect('/login');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          My profile
        </h1>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile/settings" className="flex items-center gap-1.5">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>

      <ProfileEditForm profile={profile} />
    </div>
  );
}
