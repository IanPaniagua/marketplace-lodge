'use client';

/** Converts a base64url-encoded string to a Uint8Array (for pushManager.subscribe). */
function base64urlToUint8Array(b64: string): Uint8Array {
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  const standard = padded.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(standard);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/** Returns the current push permission state, or 'unsupported' if the browser can't do push. */
export function getPushPermissionStatus(): PermissionStatus {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PermissionStatus;
}

export type SubscribeResult = { ok: true } | { ok: false; reason: string };

/**
 * Request notification permission, subscribe to push, and save the subscription
 * to the server. Returns { ok: true } on success, or { ok: false, reason } with a
 * human-readable reason so failures are diagnosable on devices without devtools.
 */
export async function requestPermissionAndSubscribe(): Promise<SubscribeResult> {
  if (getPushPermissionStatus() === 'unsupported') {
    return { ok: false, reason: 'Push is not supported on this browser/device' };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (e) {
    return { ok: false, reason: `Permission request failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (permission !== 'granted') {
    return { ok: false, reason: `Permission was "${permission}" — allow notifications in settings` };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { ok: false, reason: 'VAPID public key missing — not set in the Vercel build' };
  }

  let subscription: PushSubscription;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    subscription = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64urlToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });
  } catch (e) {
    return { ok: false, reason: `subscribe() failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh_key = json.keys?.p256dh;
  const auth_key = json.keys?.auth;
  if (!endpoint || !p256dh_key || !auth_key) {
    return { ok: false, reason: 'Subscription returned without keys' };
  }

  let res: Response;
  try {
    res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, p256dh_key, auth_key, user_agent: navigator.userAgent }),
    });
  } catch (e) {
    return { ok: false, reason: `Network error saving subscription: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!res.ok) {
    return { ok: false, reason: `Server rejected subscription (HTTP ${res.status})` };
  }

  return { ok: true };
}

/** Remove the push subscription from the server and unsubscribe locally. */
export async function unsubscribeFromPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return false;

  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return true; // already gone

  const endpoint = subscription.endpoint;

  // Unsubscribe locally
  await subscription.unsubscribe();

  // Remove from server (best-effort)
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined);

  return true;
}

/** Returns true if the user has an active push subscription on this device. */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (getPushPermissionStatus() !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js').catch(() => undefined);
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription().catch(() => undefined);
  return !!sub;
}

/**
 * Silently ensures the browser subscription exists AND is persisted on the server.
 * Assumes permission is already `granted`. Idempotent: safe to call on every app load.
 * Returns true if a valid subscription is now registered on the server.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (getPushPermissionStatus() !== 'granted') return false;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64urlToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });
    }

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh_key = json.keys?.p256dh;
    const auth_key = json.keys?.auth;
    if (!endpoint || !p256dh_key || !auth_key) return false;

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, p256dh_key, auth_key, user_agent: navigator.userAgent }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
