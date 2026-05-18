import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'insforge_token';
const REFRESH_COOKIE = 'insforge_refresh';
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;

async function getUser(token: string) {
  const res = await fetch(`${INSFORGE_URL}/api/auth/sessions/current`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = await res.json() as { user?: { id: string } };
  return body.user ?? null;
}

async function getProfile(token: string, userId: string) {
  const url = `${INSFORGE_URL}/api/database/records/profiles?select=is_approved,is_admin,deleted_at,last_active_at&id=eq.${userId}&limit=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const rows = await res.json() as Array<{
    is_approved: boolean;
    is_admin: boolean;
    deleted_at: string | null;
    last_active_at: string | null;
  }>;
  return rows[0] ?? null;
}

const LAST_ACTIVE_THROTTLE_MS = 60 * 60 * 1000;

async function touchLastActive(token: string, userId: string): Promise<void> {
  const url = `${INSFORGE_URL}/api/database/records/profiles?id=eq.${userId}`;
  try {
    await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ last_active_at: new Date().toISOString() }),
      cache: 'no-store',
    });
  } catch {
    // Best-effort — never block navigation if the write fails.
  }
}

function redirectToRefresh(request: NextRequest) {
  const refreshUrl = new URL('/session-refresh', request.url);
  refreshUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(refreshUrl);
}

function redirectToLogin(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', request.url));
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!token) {
    if (refresh) return redirectToRefresh(request);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const user = await getUser(token);
  if (!user) {
    if (refresh) return redirectToRefresh(request);
    return redirectToLogin(request);
  }

  const profile = await getProfile(token, user.id);

  // No profile or soft-deleted → login (also clear refresh — the account is gone)
  if (!profile || profile.deleted_at) {
    return redirectToLogin(request);
  }

  // Not approved → pending
  if (!profile.is_approved) {
    if (!pathname.startsWith('/pending')) {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
    return NextResponse.next();
  }

  // Admin gate for /admin routes
  if (pathname.startsWith('/admin') && !profile.is_admin) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const lastActiveMs = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
  if (Date.now() - lastActiveMs > LAST_ACTIVE_THROTTLE_MS) {
    await touchLastActive(token, user.id);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!login|signup|pending|verify-email|privacy|session-refresh|api/auth|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};
