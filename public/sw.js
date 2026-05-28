const CACHE_NAME = 'lodge-v4';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
];

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Fetch strategy:
// - _next/static and icons → cache-first
// - everything else → network-first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json';

  if (isStatic) {
    // Cache-first
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetchAndCache(request)),
    );
  } else {
    // Network-first
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? new Response('Offline', { status: 503 }))),
    );
  }
});

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  });
}

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const { title, body, url, type, badgeCount } = data;

  event.waitUntil((async () => {
    // Suppress the system notification banner when the user already has the
    // target URL open and focused — avoids double-notification while in-app.
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const alreadyFocused = clientList.some(
      (c) => c.focused && url && new URL(c.url).pathname === new URL(url, self.location.origin).pathname,
    );

    const tasks = [];

    if (!alreadyFocused && title) {
      tasks.push(
        self.registration.showNotification(title, {
          body: body ?? '',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: { url: url ?? '/' },
          // Group messages from the same chat under one tag, but re-alert on each
          // new message so consecutive messages still notify.
          tag: type === 'message' && url ? `msg-${url}` : undefined,
          renotify: type === 'message' && url ? true : undefined,
        }),
      );
    }

    // Only message pushes set the app icon badge.
    // self.navigator (ServiceWorkerGlobalScope#navigator) — NOT self.registration.navigator
    if (type === 'message' && typeof badgeCount === 'number' && self.navigator?.setAppBadge) {
      tasks.push(self.navigator.setAppBadge(badgeCount));
    }

    await Promise.all(tasks);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => {
        try { return new URL(w.url).pathname === new URL(targetUrl, self.location.origin).pathname; }
        catch { return false; }
      });
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});
