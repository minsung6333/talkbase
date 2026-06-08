// TalkBase Service Worker
// - PWA 인식용 fetch handler
// - Web Share Target API: POST /upload/share를 가로채 파일을 IndexedDB에 저장
//   (Vercel Serverless 4.5MB request body 한도를 우회)

const CACHE_NAME = 'talkbase-v2'
const SHARE_IDB_NAME = 'talkbase-share'
const SHARE_STORE = 'pending'
const SHARE_KEY = 'current'

self.addEventListener('install', () => {
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // POST /upload/share → Share Target 가로채기
  if (event.request.method === 'POST' && url.pathname === '/upload/share') {
    event.respondWith(handleShare(event.request))
    return
  }

  // GET만 캐시 흐름
  if (event.request.method !== 'GET') return
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})

// ─── Share Target 처리 ───────────────────────────────

async function handleShare(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const title = formData.get('title') || ''

    if (!file || typeof file === 'string' || file.size === 0) {
      return Response.redirect('/upload?share_error=no_file', 303)
    }

    // 500MB 한도
    if (file.size > 500 * 1024 * 1024) {
      return Response.redirect('/upload?share_error=too_large', 303)
    }

    await saveShareToIDB({
      file,
      filename: file.name,
      title: typeof title === 'string' ? title : '',
      ts: Date.now(),
    })

    return Response.redirect('/upload?from_share=1', 303)
  } catch (err) {
    console.error('[SW] Share Target 처리 실패:', err)
    return Response.redirect('/upload?share_error=upload_failed', 303)
  }
}

function openShareDB() {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(SHARE_IDB_NAME, 1)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(SHARE_STORE)) {
        db.createObjectStore(SHARE_STORE)
      }
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
}

async function saveShareToIDB(payload) {
  const db = await openShareDB()
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SHARE_STORE, 'readwrite')
      tx.objectStore(SHARE_STORE).put(payload, SHARE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
