import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';

// Insforge storage requires an authenticated user for uploads (RLS:
// uploaded_by = auth.jwt() sub). The browser client only has the anon key, so
// uploads must go through the server where the user's token lives in an
// HttpOnly cookie.
const ALLOWED_BUCKET = 'listing-photos';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const path = form.get('path');
  if (!(file instanceof File) || typeof path !== 'string' || !path) {
    return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
  }

  const client = createServerClient(token);
  const { data, error } = await client.storage.from(ALLOWED_BUCKET).upload(path, file);
  if (error || !data) {
    console.error('[upload] storage error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const url = (data as { url?: string }).url ?? null;
  return NextResponse.json({ data: { path, url } });
}
