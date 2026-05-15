import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { SESSION_COOKIE, REFRESH_COOKIE } from '@/lib/insforge';

const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 365;

const BodySchema = z.object({
  accessToken: z.string().min(10),
  refreshToken: z.string().min(10).optional(),
});

function isSecure(req: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return false;
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto.includes('https');
  return req.nextUrl.protocol === 'https:';
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  const secure = isSecure(req);

  res.cookies.set(SESSION_COOKIE, parsed.data.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL_SECONDS,
  });

  if (parsed.data.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, parsed.data.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TTL_SECONDS,
    });
  }

  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const secure = isSecure(req);
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
