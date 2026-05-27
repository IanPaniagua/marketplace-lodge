// Web Push (RFC 8030 + RFC 8291 + VAPID) using WebCrypto only.
// No external dependencies — works in Deno and any modern JS runtime.

export interface VapidConfig {
  subject: string;    // mailto: or https: URI
  publicKey: string;  // base64url uncompressed P-256 point (65 bytes, starts with 04)
  privateKey: string; // base64url raw P-256 scalar (32 bytes)
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh_key: string; // base64url browser public key
  auth_key: string;   // base64url 16-byte auth secret
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  type: string;
  badgeCount?: number;
}

export interface SendWebPushResult {
  ok: boolean;
  status?: number;
  expired?: boolean; // 404/410 → caller should delete this subscription row
}

// ── Encoding helpers ──────────────────────────────────────────────────────────

function base64urlToBytes(b64: string): Uint8Array {
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  const standard = padded.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(standard);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// ── VAPID JWT ─────────────────────────────────────────────────────────────────

async function buildVapidJwt(endpoint: string, vapid: VapidConfig): Promise<string> {
  const audience = new URL(endpoint).origin;
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = { aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject };

  const enc = (obj: unknown) => bytesToBase64url(new TextEncoder().encode(JSON.stringify(obj)));
  const signingInput = `${enc(header)}.${enc(claims)}`;

  // Import private key as JWK using x/y extracted from the public key
  // vapid.publicKey is 65-byte uncompressed P-256 point: 04 || x[32] || y[32]
  const pubBytes = base64urlToBytes(vapid.publicKey);
  const x = bytesToBase64url(pubBytes.slice(1, 33));
  const y = bytesToBase64url(pubBytes.slice(33, 65));
  const d = vapid.privateKey; // already base64url

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d, x, y, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  // WebCrypto ECDSA returns raw IEEE P1363 format: r||s (64 bytes) — no DER parsing needed
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${bytesToBase64url(new Uint8Array(sig))}`;
}

// ── RFC 8291 payload encryption ───────────────────────────────────────────────

async function encryptPayload(
  plaintext: Uint8Array,
  subscription: PushSubscriptionKeys,
): Promise<Uint8Array> {
  const browserPublicKeyBytes = base64urlToBytes(subscription.p256dh_key);
  const authSecret = base64urlToBytes(subscription.auth_key);

  // Ephemeral server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey),
  );

  const browserPublicKey = await crypto.subtle.importKey(
    'raw',
    browserPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: browserPublicKey }, serverKeyPair.privateKey, 256),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  async function hkdf(ikm: Uint8Array, hkdfSalt: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: hkdfSalt, info }, key, len * 8);
    return new Uint8Array(bits);
  }

  // RFC 8291 key derivation
  const keyInfo = concatBytes(
    new TextEncoder().encode('WebPush: info\x00'),
    browserPublicKeyBytes,
    serverPublicKeyRaw,
  );
  const prk = await hkdf(sharedSecret, authSecret, keyInfo, 32);

  const cek = await hkdf(prk, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdf(prk, salt, new TextEncoder().encode('Content-Encoding: nonce\x00'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  // Pad: 2-byte big-endian padding length (0) + plaintext + delimiter 0x02
  const padded = concatBytes(new Uint8Array(2), plaintext, new Uint8Array([2]));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded),
  );

  // RFC 8291 header: salt(16) + rs(4, big-endian 4096) + keyid_len(1) + server_pubkey(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concatBytes(salt, rs, new Uint8Array([serverPublicKeyRaw.length]), serverPublicKeyRaw, encrypted);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendWebPush(
  subscription: PushSubscriptionKeys,
  payload: PushPayload,
  vapid: VapidConfig,
): Promise<SendWebPushResult> {
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await encryptPayload(plaintext, subscription);
  const jwt = await buildVapidJwt(subscription.endpoint, vapid);

  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aes128gcm',
    'TTL': '86400',
    'Authorization': `vapid t=${jwt},k=${vapid.publicKey}`,
  };

  let res: Response;
  try {
    res = await fetch(subscription.endpoint, { method: 'POST', headers, body: ciphertext });
  } catch {
    return { ok: false };
  }

  if (res.status === 201 || res.status === 200) return { ok: true, status: res.status };
  if (res.status === 404 || res.status === 410) return { ok: false, status: res.status, expired: true };
  return { ok: false, status: res.status };
}
