import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, REFRESH_COOKIE } from '@/lib/insforge';

const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 365;

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

function isSecure(req: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return false;
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto.includes('https');
  return req.nextUrl.protocol === 'https:';
}

function clearCookies(res: NextResponse, secure: boolean) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  const secure = isSecure(req);

  if (!refreshToken) {
    const res = NextResponse.json({ error: 'NO_REFRESH_TOKEN' }, { status: 401 });
    clearCookies(res, secure);
    return res;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${INSFORGE_URL}/api/auth/refresh?client_type=mobile`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'NETWORK_ERROR' }, { status: 502 });
  }

  if (!upstream.ok) {
    const res = NextResponse.json({ error: 'REFRESH_FAILED' }, { status: 401 });
    clearCookies(res, secure);
    return res;
  }

  const data = (await upstream.json()) as {
    accessToken?: string;
    refreshToken?: string;
  };

  if (!data.accessToken) {
    const res = NextResponse.json({ error: 'REFRESH_FAILED' }, { status: 401 });
    clearCookies(res, secure);
    return res;
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, data.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL_SECONDS,
  });
  if (data.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, data.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TTL_SECONDS,
    });
  }
  return res;
}
