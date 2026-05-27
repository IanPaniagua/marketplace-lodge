import { getServerProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TopBar from '@/components/shared/TopBar';
import BottomNav from '@/components/shared/BottomNav';
import SessionKeeper from '@/components/shared/SessionKeeper';
import PushPermissionBanner from '@/components/shared/PushPermissionBanner';
import { getAdminPendingCounts } from '@/lib/admin-counts';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerProfile();
  if (!profile) redirect('/login');

  let initialPendingCount = 0;
  if (profile.is_admin) {
    try {
      const counts = await getAdminPendingCounts();
      initialPendingCount = counts.total;
    } catch {
      // Non-fatal — the badge will refresh client-side.
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SessionKeeper />
      <TopBar profile={profile} initialPendingCount={initialPendingCount} />
      <PushPermissionBanner />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 md:max-w-4xl md:px-6">
        {children}
      </main>
      <BottomNav userId={profile.id} />
    </div>
  );
}
