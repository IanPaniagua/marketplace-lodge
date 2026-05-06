import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'insforge_token';
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
  const url = `${INSFORGE_URL}/api/database/records/profiles?select=is_approved,is_admin,deleted_at&id=eq.${userId}&limit=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const rows = await res.json() as Array<{
    is_approved: boolean;
    is_admin: boolean;
    deleted_at: string | null;
  }>;
  return rows[0] ?? null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const user = await getUser(token);
  if (!user) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const profile = await getProfile(token, user.id);

  // No profile or soft-deleted → login
  if (!profile || profile.deleted_at) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!login|signup|pending|verify-email|privacy|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};
