import { createClient } from '@insforge/sdk';

const url = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

// Singleton browser client. We run it in mobile/server auth mode so refresh tokens
// come back in the response body — we then store them in same-origin HttpOnly
// cookies via /api/auth/session. iOS Safari and standalone PWAs strip JS-set
// cookies after 7 days and block third-party cookies, so we cannot rely on the
// SDK's default browser cookie flow on `*.insforge.app`.
export const insforge = createClient({ baseUrl: url, anonKey, isServerMode: true });

export const SESSION_COOKIE = 'insforge_token';
export const REFRESH_COOKIE = 'insforge_refresh';
