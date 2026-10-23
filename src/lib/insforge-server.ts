import { createClient } from '@insforge/sdk';

const url = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

/**
 * Per-request server client authenticated with the user's access token.
 * Use in middleware and server components.
 */
export function createServerClient(accessToken: string) {
  return createClient({ baseUrl: url, anonKey, edgeFunctionToken: accessToken });
}

/** Public server client for link-only catalog pages. RLS limits it to public rows. */
export function createPublicClient() {
  return createClient({ baseUrl: url, anonKey, isServerMode: true });
}

/**
 * Admin client using the service key.
 * Only for Route Handlers under /api/admin/* that verify is_admin themselves.
 */
export function createAdminClient() {
  const serviceKey = process.env.INSFORGE_SERVICE_KEY;
  if (!serviceKey) throw new Error('INSFORGE_SERVICE_KEY is not set');
  return createClient({ baseUrl: url, edgeFunctionToken: serviceKey });
}
