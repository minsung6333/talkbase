'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, Download } from 'lucide-react'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Status = 'pass' | 'fail' | 'pending' | 'unknown'

interface Check {
  label: string
  status: Status
  detail?: string
}

export default function PWAStatusPage() {
  const [checks, setChecks] = useState<Check[]>([])
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [userAgent, setUserAgent] = useState('')
  const [manifestData, setManifestData] = useState<Record<string, unknown> | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const run = async () => {
      const newChecks: Check[] = []

      // 1. HTTPS + Origin 정보
      newChecks.push({
        label: 'HTTPS 연결',
        status: location.protocol === 'https:' ? 'pass' : 'fail',
        detail: location.protocol,
      })

      newChecks.push({
        label: '현재 Origin (R2 CORS 매칭용)',
        status: 'pass',
        detail: location.origin,
      })

      // 2. manifest.webmanifest (Next.js 자동 생성) — 캐시 버스터 포함
      const cacheBuster = `?_=${Date.now()}`
      let manifestOk = false
      const errors: string[] = []
      for (const url of ['/manifest.webmanifest', '/manifest.json']) {
        try {
          const res = await fetch(url + cacheBuster, { cache: 'no-store' })
          if (res.ok) {
            const text = await res.text()
            try {
              const json = JSON.parse(text)
              setManifestData(json)
              newChecks.push({
                label: `manifest 로드 OK`,
                status: 'pass',
                detail: `${url} · ${json.name} · ${json.icons?.length || 0}개 아이콘 · ${res.headers.get('content-type')}`,
              })
              manifestOk = true
              break
            } catch {
              errors.push(`${url}: 응답이 JSON 아님 (${text.slice(0, 60)}...)`)
            }
          } else {
            errors.push(`${url}: HTTP ${res.status}`)
          }
        } catch (e) {
          errors.push(`${url}: ${e instanceof Error ? e.message : 'fetch 실패'}`)
        }
      }
      if (!manifestOk) {
        newChecks.push({
          label: 'manifest 로드 실패',
          status: 'fail',
          detail: errors.join(' / '),
        })
      }

      // 2-1. document.querySelector link rel="manifest"
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
      if (manifestLink) {
        newChecks.push({
          label: '<link rel="manifest"> 태그',
          status: 'pass',
          detail: manifestLink.href,
        })
      } else {
        newChecks.push({
          label: '<link rel="manifest"> 태그',
          status: 'fail',
          detail: 'HTML에 manifest 링크 없음',
        })
      }

      // 3. Service Worker
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          newChecks.push({
            label: 'Service Worker 등록됨',
            status: 'pass',
            detail: reg.active ? '활성화' : '대기 중',
          })
        } else {
          newChecks.push({
            label: 'Service Worker 등록됨',
            status: 'pending',
            detail: '아직 등록 안 됨. 새로고침 한 번 더 해보세요.',
          })
        }
      } else {
        newChecks.push({
          label: 'Service Worker 지원',
          status: 'fail',
          detail: '브라우저가 지원 안 함',
        })
      }

      // 4. PNG 아이콘 접근
      const iconRes = await fetch('/icon-192.png', { method: 'HEAD' })
      newChecks.push({
        label: 'PNG 192 아이콘',
        status: iconRes.ok ? 'pass' : 'fail',
        detail: iconRes.ok ? `${iconRes.headers.get('content-type')}` : 'Not found',
      })

      const icon512Res = await fetch('/icon-512.png', { method: 'HEAD' })
      newChecks.push({
        label: 'PNG 512 아이콘',
        status: icon512Res.ok ? 'pass' : 'fail',
        detail: icon512Res.ok ? `${icon512Res.headers.get('content-type')}` : 'Not found',
      })

      // 5. Standalone 모드
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
      newChecks.push({
        label: '설치 상태',
        status: isStandalone ? 'pass' : 'pending',
        detail: isStandalone ? '✓ 이미 PWA로 설치되어 사용 중' : '아직 설치 전',
      })

      // 6. beforeinstallprompt 캐치
      newChecks.push({
        label: 'beforeinstallprompt 이벤트',
        status: installPrompt ? 'pass' : 'pending',
        detail: installPrompt
          ? '발생함. 아래 버튼으로 설치 가능'
          : '아직 발생 안 함. Chrome이 추가 시간 필요할 수 있음',
      })

      setChecks(newChecks)
    }

    run()
    setUserAgent(navigator.userAgent)

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [refreshKey, installPrompt])

  const tryInstall = async () => {
    if (!installPrompt) {
      alert('아직 설치 프롬프트가 준비되지 않았어요.\n페이지에서 30초 정도 머무른 후 다시 시도해보세요.')
      return
    }
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  const clearAllData = async () => {
    if (!confirm('Service Worker와 캐시를 모두 삭제할까요? 다음 새로고침 시 다시 등록돼요.')) return

    // Service Worker 해제
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) await reg.unregister()
    }
    // 캐시 삭제
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    // localStorage 클리어
    localStorage.removeItem('pwa-install-dismissed-at')

    alert('초기화 완료! 페이지를 새로고침합니다.')
    location.reload()
  }

  const allPass = checks.length > 0 && checks.every(c => c.status === 'pass' || c.status === 'pending')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> 홈
          </Link>
          <Link href="/" className="flex items-center font-bold text-gray-900">
            <TalkBaseLogo variant="icon" size={28} />
            <span className="tracking-tight text-sm -ml-1">TalkBase</span>
          </Link>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PWA 설치 진단</h1>
          <p className="text-sm text-gray-500 mt-1">앱 설치가 안 될 때 어떤 조건이 부족한지 확인해요</p>
        </div>

        {/* 종합 상태 */}
        <div className={`rounded-2xl p-5 ${allPass ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <div className="flex items-start gap-3">
            {allPass
              ? <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
            }
            <div>
              <p className={`font-semibold text-sm ${allPass ? 'text-green-900' : 'text-yellow-900'}`}>
                {allPass ? '모든 조건 충족' : '일부 조건 미충족'}
              </p>
              <p className={`text-xs mt-1 ${allPass ? 'text-green-700' : 'text-yellow-700'}`}>
                {allPass
                  ? '아래 버튼으로 설치할 수 있어요'
                  : '아래 항목 중 빨간색이 있다면 해결 필요'}
              </p>
            </div>
          </div>
        </div>

        {/* 설치 시도 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={tryInstall}
            disabled={!installPrompt}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            {installPrompt ? '지금 설치하기' : '설치 준비 중...'}
          </button>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 rounded-2xl px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            다시 확인
          </button>
        </div>

        {/* 진단 결과 */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">진단 항목</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {checks.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                {c.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
                {c.status === 'fail' && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                {c.status === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />}
                {c.status === 'unknown' && <AlertCircle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.label}</p>
                  {c.detail && (
                    <p className="text-xs text-gray-500 mt-0.5 break-all">{c.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* manifest 정보 */}
        {manifestData && (
          <details className="bg-white rounded-2xl border border-gray-100 p-4 group">
            <summary className="font-semibold text-gray-900 text-sm cursor-pointer">
              manifest.json 내용
            </summary>
            <pre className="text-xs text-gray-600 mt-3 bg-gray-50 rounded-xl p-3 overflow-x-auto">
              {JSON.stringify(manifestData, null, 2)}
            </pre>
          </details>
        )}

        {/* User Agent */}
        <details className="bg-white rounded-2xl border border-gray-100 p-4 group">
          <summary className="font-semibold text-gray-900 text-sm cursor-pointer">
            브라우저 정보
          </summary>
          <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-xl p-3 break-all">
            {userAgent}
          </p>
        </details>

        {/* 트러블슈팅 */}
        <div className="bg-blue-50 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-blue-900 text-sm">💡 설치 안 될 때 시도해보기</h3>
          <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
            <li>페이지에서 30초~1분 정도 머무르기 (Chrome engagement 필요)</li>
            <li>여러 페이지 이동해보기 (홈 → 보관함 → 검색 등)</li>
            <li>모든 데이터 초기화 후 재시도 (아래 버튼)</li>
            <li>크롬 외 다른 브라우저 시도 (삼성 인터넷)</li>
            <li>iPhone은 반드시 Safari 사용</li>
          </ul>
        </div>

        {/* 초기화 */}
        <button
          onClick={clearAllData}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 rounded-2xl py-3 text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Service Worker · 캐시 초기화
        </button>

        <div className="text-center pb-12">
          <Link href="/help/install" className="text-xs text-blue-600 hover:underline">
            ← 설치 가이드로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  )
}
