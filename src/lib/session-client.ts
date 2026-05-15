/**
 * Client helpers for the same-origin auth-cookie endpoints.
 * Always call these instead of writing `document.cookie` directly — JS-set
 * cookies are capped to 7 days on iOS Safari / PWA, so we persist the session
 * via HttpOnly cookies set by our Route Handlers.
 */

export async function setSessionCookies(args: { accessToken: string; refreshToken?: string }) {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return res.ok;
}

export async function clearSessionCookies() {
  await fetch('/api/auth/session', {
    method: 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
  });
}

export async function refreshSession() {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return res.ok;
}
