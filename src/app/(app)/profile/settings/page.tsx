import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsForm from '@/components/profile/SettingsForm';
import BlockedUsersList from '@/components/profile/BlockedUsersList';
import { getCurrentUserEmail } from '@/app/(app)/profile/actions';

export const metadata = { title: 'Settings — Lodge' };

export default async function ProfileSettingsPage() {
  const email = await getCurrentUserEmail();
  if (!email) redirect('/login');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Settings
        </h1>
      </div>

      <SettingsForm email={email} />

      <section className="space-y-4 border-t pt-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Blocked users</h2>
          <p className="text-sm text-muted-foreground">
            Unblocking restores their profile, listings, and any existing chat
            between you.
          </p>
        </div>
        <BlockedUsersList />
      </section>

      <p className="border-t pt-4 text-xs text-muted-foreground">
        See our{' '}
        <Link
          href="/privacy"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
