import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/insforge-server';

export const dynamic = 'force-dynamic';

function isAuthorizedCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    return request.headers.get('authorization') === `Bearer ${cronSecret}`;
  }

  return request.headers.get('user-agent')?.includes('vercel-cron/1.0') ?? false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.database.from('profiles').select('id').limit(1);

    if (error) {
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: { 'cache-control': 'no-store' },
      },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
