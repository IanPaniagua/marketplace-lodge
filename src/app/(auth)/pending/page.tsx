'use client';

import { useRouter } from 'next/navigation';
import { ClockIcon } from 'lucide-react';
import { toast } from 'sonner';
import { insforge } from '@/lib/insforge';
import { clearSessionCookies } from '@/lib/session-client';
import { Button } from '@/components/ui/button';

export default function PendingPage() {
  const router = useRouter();

  async function handleSignOut() {
    await insforge.auth.signOut();
    await clearSessionCookies();
    toast.success('Signed out.');
    router.replace('/login');
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <ClockIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Waiting for approval</h1>
        <p className="text-sm text-muted-foreground">
          Your account is pending review. You will be able to browse and post listings once an admin
          approves you.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}
