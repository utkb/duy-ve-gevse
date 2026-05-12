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
     "Cache first, ağdan güncelle"
   - Ses dosyaları: ses/manifest.json okunur, listedeki tüm sesler
     install sırasında komple GET ile indirilir ve önbelleğe alınır.
     <audio> Range request yapsa bile cache'ten parça parça servis edilir.
   - Google Fonts: stale-while-revalidate
   - HEAD, OPTIONS gibi non-GET istekleri SW'den geçmez.
───────────────────────────────────────────── */

const CACHE_VERSION = 'duygevse-v4';
const CACHE_STATIC  = 'duygevse-static-v4';
const CACHE_MEDIA   = 'duygevse-media-v4';
const CACHE_FONTS   = 'duygevse-fonts-v4';

/* Uygulama kabuğu — bunlar mutlaka önbelleğe alınsın */
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png',
  './icon-192.png',
  './icon-180.png',
];

/* ── Kurulum: kabuk + ses manifesti okunur, sesler arka planda indirilir ── */
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS)),
      precacheAudioFiles(),
    ])
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('SW kurulum hatası:', err);
      })
  );
});

/* Ses dosyalarını manifest'ten okuyup önceden cache'le */
async function precacheAudioFiles() {
  try {
    const res = await fetch('./ses/manifest.json');
    if (!res.ok) return;
    const list = await res.json();
    const cache = await caches.open(CACHE_MEDIA);

    /* Her ses dosyasını paralel olarak GET ile çek — Range değil, tam dosya.
       Bir tanesi başarısız olsa diğerleri etkilenmesin diye allSettled. */
    await Promise.allSettled(
      list.map(async item => {
        const url = './ses/' + item.dosya;
        try {
          const response = await fetch(url);
          if (response && response.ok) {
            await cache.put(url, response);
          }
        } catch {
          /* Tek dosya kaçırsa sorun değil */
        }
      })
    );
  } catch (err) {
    console.warn('Ses precache atlandı:', err);
  }
}

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
  const request = event.request;

  /* GET olmayan istekleri SW'den geçirme */
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* Google Fonts → stale-while-revalidate */
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_FONTS));
    return;
  }

  /* Ses dosyaları — Range request olabilir, özel handler */
  if (url.pathname.match(/\.(mp3|ogg|wav|m4a)$/i)) {
    event.respondWith(handleAudioRequest(request, CACHE_MEDIA));
    return;
  }

  /* Görsel dosyalar → cache-first */
  if (url.pathname.match(/\.(gif|png|jpg|jpeg|webp|svg)$/i)) {
    event.respondWith(cacheFirstThenNetwork(request, CACHE_MEDIA));
    return;
  }

  /* Uygulama kabuğu ve diğer → stale-while-revalidate */
  event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
});

/* ─── Yardımcı fonksiyonlar ─── */

/* Ses isteklerinin özel ele alınması — Range request desteği */
async function handleAudioRequest(request, cacheName) {
  const cache = await caches.open(cacheName);
  const rangeHeader = request.headers.get('range');

  /* Önbellekte tam dosya var mı? URL ile ara çünkü Range header'ı eşleşmeyebilir. */
  const cached = await cache.match(request.url);

  if (cached) {
    if (rangeHeader) {
      return buildRangeResponse(cached, rangeHeader);
    }
    return cached;
  }

  /* Önbellekte yok — ağdan al */
  try {
    const fullResponse = await fetch(request.url);
    if (fullResponse && fullResponse.ok) {
      cache.put(request.url, fullResponse.clone()).catch(() => {});

      if (rangeHeader) {
        return buildRangeResponse(fullResponse, rangeHeader);
      }
      return fullResponse;
    }
    return fullResponse;
  } catch {
    return new Response('Çevrimdışı: ses dosyası önbellekte yok.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/* Tam dosyadan Range cevabı üret */
async function buildRangeResponse(response, rangeHeader) {
  const buffer = await response.arrayBuffer();
  const total  = buffer.byteLength;

  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
  if (!match) {
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
        'Content-Length': String(total),
        'Accept-Ranges': 'bytes',
      }
    });
  }

  const start = parseInt(match[1], 10);
  const end   = match[2] ? parseInt(match[2], 10) : total - 1;
  const slice = buffer.slice(start, end + 1);

  return new Response(slice, {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': String(slice.byteLength),
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
    }
  });
}

/* Önce önbellekten sun, arka planda ağdan güncelle */
async function staleWhileRevalidate(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone()).catch(() => {});
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
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return new Response('Çevrimdışı: bu kaynak henüz önbelleğe alınmadı.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
