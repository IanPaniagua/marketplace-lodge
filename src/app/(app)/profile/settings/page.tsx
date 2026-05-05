import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsForm from '@/components/profile/SettingsForm';
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
    </div>
  );
}
