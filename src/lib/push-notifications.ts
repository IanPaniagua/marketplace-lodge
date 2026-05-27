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

/**
 * Request notification permission, subscribe to push, and save the subscription
 * to the server. Returns true on success.
 */
export async function requestPermissionAndSubscribe(): Promise<boolean> {
  if (getPushPermissionStatus() === 'unsupported') return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
    return false;
  }

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64urlToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  });

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh_key = json.keys?.p256dh;
  const auth_key = json.keys?.auth;

  if (!endpoint || !p256dh_key || !auth_key) return false;

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint,
      p256dh_key,
      auth_key,
      user_agent: navigator.userAgent,
    }),
  });

  return res.ok;
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
