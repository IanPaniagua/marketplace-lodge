import { getServerProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TopBar from '@/components/shared/TopBar';
import BottomNav from '@/components/shared/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerProfile();
  if (!profile) redirect('/login');

  return (
    <div className="min-h-dvh bg-background">
      <TopBar profile={profile} />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 md:max-w-4xl md:px-6">
        {children}
      </main>
      <BottomNav userId={profile.id} />
    </div>
  );
}
