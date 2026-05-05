import { createClient } from '@insforge/sdk';

const url = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

// Singleton browser client — used in "use client" components
export const insforge = createClient({ baseUrl: url, anonKey });

export const SESSION_COOKIE = 'insforge_token';
