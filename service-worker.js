const CACHE = 'daystar-shell-v5';
const SHELL = ['/index.html', '/app.html', '/landing.css', '/dashboard.css', '/install.js', '/task-sync.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
function shellPath(path) {
  if (path === '/' || path === '/index' || path === '/index/') return '/index.html';
  if (path === '/app' || path === '/app/') return '/app.html';
  return path;
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('daystar-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_OFFLINE' || !event.ports[0]) return;
  event.waitUntil(caches.open(CACHE).then(async cache => {
    const entries = await Promise.all(SHELL.map(path => cache.match(path)));
    event.ports[0].postMessage({ready: entries.every(Boolean)});
  }));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const path = shellPath(url.pathname);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !SHELL.includes(path)) return;
  // The versioned shell is complete before activation; no network is needed to open it.
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(path);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(path, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  }));
});
