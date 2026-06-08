/**
 * Service Worker가 Share Target POST를 가로채 IndexedDB에 저장한 파일을 꺼내는 헬퍼.
 * SW(public/sw.js)의 saveShareToIDB 와 같은 DB/스토어/키를 사용해야 함.
 */

const DB_NAME = 'talkbase-share'
const STORE = 'pending'
const KEY = 'current'

export interface SharedFilePayload {
  file: File | Blob
  filename: string
  title: string
  ts: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB 사용 불가'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 공유된 파일 1건을 꺼내고 IDB에선 삭제 */
export async function loadSharedFromIDB(): Promise<SharedFilePayload | null> {
  let db: IDBDatabase
  try {
    db = await openDB()
  } catch {
    return null
  }

  try {
    return await new Promise<SharedFilePayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const getReq = store.get(KEY)
      getReq.onsuccess = () => {
        const data = getReq.result as SharedFilePayload | undefined
        if (data) store.delete(KEY)
        tx.oncomplete = () => resolve(data || null)
        tx.onerror = () => reject(tx.error)
      }
      getReq.onerror = () => reject(getReq.error)
    })
  } finally {
    db.close()
  }
}
