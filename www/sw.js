// Devocional 12 — Service Worker (PWA + Push)
// Strategy:
//  - HTML/CSS/JS: network-first, fallback cache (pra o app abrir offline depois)
//  - Imagens/audios: cache-first com TTL
//  - Push notifications: handled by 'push' event
//  - Notification click: open /?focus=chat
const CACHE_VERSION = 'devocional12-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.jpg',
  '/icons/icon-512.jpg',
  '/icons/badge-96.jpg',
  '/css/style.css',
  '/js/app.js',
  '/js/chat.js',
  '/js/player.js',
  '/js/audio-recorder.js',
  '/js/pwa.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] precache parcial:', err.message);
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Audio + imagens = cache-first
  if (/\.(mp3|aac|jpg|jpeg|png|webp|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((resp) => {
            if (resp.ok) cache.put(req, resp.clone());
            return resp;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Demais GETs = network-first, fallback cache
  event.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp.ok && (req.destination === 'document' || /\.(css|js|html|json)$/.test(url.pathname))) {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
        }
        return resp;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/index.html'))
      )
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Devocional 12', body: event.data.text() };
  }
  const title = payload.title || 'Devocional 12';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.jpg',
    badge: payload.badge || '/icons/badge-96.jpg',
    tag: payload.tag || 'devocional12-push',
    renotify: true,
    data: { url: payload.url || '/?focus=chat', ...(payload.data || {}) },
    actions: payload.actions || [
      { action: 'open', title: 'Abrir app' },
      { action: 'dismiss', title: 'Depois' },
    ],
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?focus=chat';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.postMessage({ type: 'PUSH_CLICK', url: targetUrl });
          return c.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});