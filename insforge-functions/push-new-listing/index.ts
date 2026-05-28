import { createClient } from 'npm:@insforge/sdk';

// ── Web Push (RFC 8030 + RFC 8291 + VAPID) ───────────────────────────────────

interface VapidConfig { subject: string; publicKey: string; privateKey: string; }
interface PushSub { endpoint: string; p256dh_key: string; auth_key: string; }
interface PushResult { ok: boolean; status?: number; expired?: boolean; }

function b64ToBytes(b64: string): Uint8Array {
  const pad = b64.length % 4;
  const s = (pad ? b64 + '='.repeat(4 - pad) : b64).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function bytesToB64(b: Uint8Array): string {
  let s = ''; for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function concat(...a: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; } return out;
}
async function buildJwt(endpoint: string, v: VapidConfig): Promise<string> {
  const aud = new URL(endpoint).origin;
  const enc = (o: unknown) => bytesToB64(new TextEncoder().encode(JSON.stringify(o)));
  const hdr = enc({ typ: 'JWT', alg: 'ES256' });
  const pay = enc({ aud, exp: Math.floor(Date.now() / 1000) + 43200, sub: v.subject });
  const pub = b64ToBytes(v.publicKey);
  const key = await crypto.subtle.importKey('jwk',
    { kty: 'EC', crv: 'P-256', d: v.privateKey, x: bytesToB64(pub.slice(1, 33)), y: bytesToB64(pub.slice(33, 65)), key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${hdr}.${pay}`));
  return `${hdr}.${pay}.${bytesToB64(new Uint8Array(sig))}`;
}
async function encrypt(plain: Uint8Array, sub: PushSub): Promise<Uint8Array> {
  const bpk = b64ToBytes(sub.p256dh_key), auth = b64ToBytes(sub.auth_key);
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const spub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const bpkKey = await crypto.subtle.importKey('raw', bpk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: bpkKey }, kp.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  async function hkdf(ikm: Uint8Array, s: Uint8Array, info: Uint8Array, l: number) {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, k, l * 8));
  }
  const prk = await hkdf(shared, auth, concat(new TextEncoder().encode('WebPush: info\x00'), bpk, spub), 32);
  const cek = await hkdf(prk, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdf(prk, salt, new TextEncoder().encode('Content-Encoding: nonce\x00'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aes, concat(new Uint8Array(2), plain, new Uint8Array([2]))));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096, false);
  return concat(salt, rs, new Uint8Array([spub.length]), spub, ct);
}
async function sendWebPush(sub: PushSub, payload: unknown, v: VapidConfig): Promise<PushResult> {
  const ct = await encrypt(new TextEncoder().encode(JSON.stringify(payload)), sub);
  const jwt = await buildJwt(sub.endpoint, v);
  let res: Response;
  try { res = await fetch(sub.endpoint, { method: 'POST', body: ct, headers: { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'aes128gcm', TTL: '86400', Authorization: `vapid t=${jwt},k=${v.publicKey}` } }); }
  catch { return { ok: false }; }
  if (res.status === 201 || res.status === 200) return { ok: true, status: res.status };
  if (res.status === 404 || res.status === 410) return { ok: false, status: res.status, expired: true };
  return { ok: false, status: res.status };
}

// ── Handler ───────────────────────────────────────────────────────────────────

const BASE_URL = Deno.env.get('INSFORGE_BASE_URL') ?? Deno.env.get('INSFORGE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('API_KEY') ?? Deno.env.get('INSFORGE_SERVICE_KEY') ?? '';

// deno-lint-ignore no-explicit-any
async function loadVapid(client: any): Promise<VapidConfig> {
  const { data } = await client.database
    .from('app_config').select('key,value')
    .in('key', ['vapid_subject', 'vapid_public_key', 'vapid_private_key']);
  const map = new Map(((data ?? []) as Array<{ key: string; value: string }>).map((r) => [r.key, r.value]));
  return {
    subject: map.get('vapid_subject') ?? '',
    publicKey: map.get('vapid_public_key') ?? '',
    privateKey: map.get('vapid_private_key') ?? '',
  };
}

export default async function handler(req: Request): Promise<Response> {
  const body = await req.json() as { listing_id?: string };
  if (!body.listing_id) return new Response(JSON.stringify({ error: 'Missing listing_id' }), { status: 400 });

  const client = createClient({ baseUrl: BASE_URL, edgeFunctionToken: SERVICE_KEY });
  const VAPID = await loadVapid(client);
  if (!VAPID.publicKey || !VAPID.privateKey) return new Response(JSON.stringify({ sent: false, reason: 'VAPID not configured' }), { status: 200 });

  const { data: listingRaw } = await client.database
    .from('listings').select('id,title,owner_id,category').eq('id', body.listing_id).single();
  if (!listingRaw) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404 });
  const listing = listingRaw as { id: string; title: string; owner_id: string; category: string };

  const { data: subsRaw } = await client.database
    .from('push_subscriptions').select('user_id,endpoint,p256dh_key,auth_key').neq('user_id', listing.owner_id);
  const subs = (subsRaw ?? []) as Array<{ user_id: string } & PushSub>;

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  if (userIds.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const { data: profilesRaw } = await client.database
    .from('profiles').select('id').in('id', userIds).eq('is_approved', true).is('deleted_at', null);
  const approvedIds = new Set(((profilesRaw ?? []) as Array<{ id: string }>).map((p) => p.id));
  const eligibleSubs = subs.filter((s) => approvedIds.has(s.user_id));

  // Write notification records for each eligible user (dedup by user_id)
  const distinctIds = [...new Set(eligibleSubs.map((s) => s.user_id))];
  if (distinctIds.length > 0) {
    await client.database.from('notifications')
      .insert(distinctIds.map((uid) => ({ recipient_id: uid, type: 'listing', ref_id: listing.id })));
  }

  const payload = { type: 'listing', title: 'New item on Lodge Market', body: listing.title, url: `/listings/${listing.id}` };
  const expired: string[] = [];
  let sent = 0;
  await Promise.all(eligibleSubs.map(async (sub) => {
    const r = await sendWebPush(sub, payload, VAPID);
    if (r.ok) sent++; else if (r.expired) expired.push(sub.endpoint);
  }));
  if (expired.length > 0) await client.database.from('push_subscriptions').delete().in('endpoint', expired);

  return new Response(JSON.stringify({ sent, expired: expired.length }), { status: 200 });
}
