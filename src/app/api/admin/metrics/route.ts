import { type NextRequest, NextResponse } from 'next/server';
import { getServerProfile } from '@/lib/auth';
import { getMetrics, parseWindow } from '@/lib/metrics';

export async function GET(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const window = parseWindow(request.nextUrl.searchParams.get('window'));

  try {
    const metrics = await getMetrics(window);
    return NextResponse.json(metrics, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to compute metrics' }, { status: 500 });
  }
}
