// TalkBase 최소 Service Worker
// 크롬이 beforeinstallprompt를 발화시키기 위해 fetch handler 필수

const CACHE_NAME = 'talkbase-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// 네트워크 우선 (PWA 인식만을 위한 최소 핸들러)
self.addEventListener('fetch', (event) => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') return

  // 외부 도메인이나 API는 캐시하지 않음
  const url = new URL(event.request.url)
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
