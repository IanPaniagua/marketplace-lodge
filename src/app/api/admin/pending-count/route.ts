import { NextResponse } from 'next/server';
import { getServerProfile } from '@/lib/auth';
import { getAdminPendingCounts } from '@/lib/admin-counts';

export async function GET() {
  const profile = await getServerProfile();
  if (!profile?.is_admin) {
    return NextResponse.json({ users: 0, listings: 0, total: 0 }, { status: 403 });
  }

  try {
    const counts = await getAdminPendingCounts();
    return NextResponse.json(counts, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ users: 0, listings: 0, total: 0 }, { status: 500 });
  }
}
