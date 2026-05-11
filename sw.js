/* ─────────────────────────────────────────────
   Duy ve Gevşe — Service Worker
   Copyright © 2026 Utku Berberoğlu
   Licensed under the EUPL-1.2-or-later

   Bu yazılım Avrupa Birliği Kamu Lisansı (EUPL) 1.2 veya sonraki sürümleri
   altında lisanslanmıştır. Lisans metni için: LICENSE dosyası

   Ses kayıtları ve görsel içerik farklı lisanslara tabidir,
ayrıntılar için: LICENSE-CONTENT.md

   Strateji:
   - Kabuk dosyaları (HTML, manifest, ikonlar):
     "Cache first, ağdan güncelle" — her zaman hızlı açılır,
     arka planda sessizce güncellenir.
   - Ses dosyaları: ilk oynatmada önbelleğe alınır,
     sonraki oynatmalar offline çalışır.
   - Google Fonts: ağdan gelirse önbelleğe al, yoksa
     önbellekten sun (yedek: sistem fontu CSS'de zaten var).
───────────────────────────────────────────── */

const CACHE_VERSION = 'duygevse-v1';
const CACHE_STATIC  = 'duygevse-static-v1';
const CACHE_MEDIA   = 'duygevse-media-v1';
const CACHE_FONTS   = 'duygevse-fonts-v1';

/* Uygulama kabuğu — bunlar mutlaka önbelleğe alınsın */
const STATIC_ASSETS = [
  './',
  './boyun-uyku.html',
  './manifest.json',
  './icon-512.png',
  './icon-192.png',
  './icon-180.png',
];

/* ── Kurulum: kabuk dosyalarını önbelleğe al ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Aktivasyon: eski önbellekleri temizle ── */
self.addEventListener('activate', event => {
  const current = [CACHE_STATIC, CACHE_MEDIA, CACHE_FONTS];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !current.includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: istek türüne göre strateji seç ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Google Fonts → önce ağ, sonra önbellek (stale-while-revalidate) */
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_FONTS));
    return;
  }

  /* Ses dosyaları → önce önbellek; yoksa ağdan al ve önbelleğe yaz */
  if (url.pathname.match(/\.(mp3|ogg|wav|m4a)$/i)) {
    event.respondWith(cacheFirstThenNetwork(event.request, CACHE_MEDIA));
    return;
  }

  /* Görsel dosyalar → aynı strateji */
  if (url.pathname.match(/\.(gif|png|jpg|jpeg|webp|svg)$/i)) {
    event.respondWith(cacheFirstThenNetwork(event.request, CACHE_MEDIA));
    return;
  }

  /* Uygulama kabuğu ve diğer → önce önbellek, arka planda güncelle */
  event.respondWith(staleWhileRevalidate(event.request, CACHE_STATIC));
});

/* ─── Yardımcı fonksiyonlar ─── */

/* Önce önbellekten sun, arka planda ağdan güncelle */
async function staleWhileRevalidate(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || await fetchPromise;
}

/* Önce önbellekten sun; yoksa ağdan al ve önbelleğe yaz */
async function cacheFirstThenNetwork(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    /* Ağ yok ve önbellekte de yok — 503 döndür */
    return new Response('Çevrimdışı: bu kaynak henüz önbelleğe alınmadı.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
