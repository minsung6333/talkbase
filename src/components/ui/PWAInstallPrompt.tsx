'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share, Smartphone, MoreVertical, Plus } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed-at'
const DISMISS_DAYS = 3

type Platform = 'android' | 'ios' | 'desktop' | 'unsupported'

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/win|mac|linux/.test(ua)) return 'desktop'
  return 'unsupported'
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const detected = detectPlatform()
    setPlatform(detected)

    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    let shouldAutoShow = true
    if (dismissedAt) {
      const elapsed = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (elapsed < DISMISS_DAYS) shouldAutoShow = false
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (shouldAutoShow) setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // 설치 완료 이벤트
    const installedHandler = () => setInstalled(true)
    window.addEventListener('appinstalled', installedHandler)

    if (shouldAutoShow && (detected === 'ios' || detected === 'android')) {
      const timer = setTimeout(() => {
        if (!deferredPrompt) setShowPrompt(true)
      }, 5000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handler)
        window.removeEventListener('appinstalled', installedHandler)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 글로벌로 노출 (다른 컴포넌트에서 트리거 가능)
  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(window as { openTalkBaseInstall?: () => void }).openTalkBaseInstall = () => {
      setShowPrompt(true)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowPrompt(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  }

  if (installed || !showPrompt) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 z-[60] animate-in slide-in-from-bottom">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          {platform === 'ios' || platform === 'android'
            ? <Smartphone className="w-5 h-5 text-blue-600" />
            : <Download className="w-5 h-5 text-blue-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">홈 화면에 추가</p>
          <p className="text-xs text-gray-500 mt-0.5">앱처럼 빠르게 사용할 수 있어요</p>

          {(platform === 'android' || platform === 'desktop') && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="mt-3 w-full bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              설치하기
            </button>
          )}

          {platform === 'android' && !deferredPrompt && (
            <div className="mt-3 text-xs text-gray-600 space-y-1.5 bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">크롬 / 삼성 인터넷에서 설치하기</p>
              <div className="flex items-center gap-1.5">
                <span>1.</span>
                <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                <span>우측 상단 메뉴 누르기</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>2.</span>
                <Plus className="w-3.5 h-3.5 text-gray-500" />
                <span>&quot;홈 화면에 추가&quot; 선택</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                💡 잠시 후 자동 설치 안내가 뜰 수도 있어요
              </p>
            </div>
          )}

          {platform === 'ios' && (
            <div className="mt-3 text-xs text-gray-600 space-y-1.5 bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">사파리에서 설치하기</p>
              <div className="flex items-center gap-1.5">
                <span>1.</span>
                <Share className="w-3.5 h-3.5 text-blue-500" />
                <span>하단 공유 버튼 누르기</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>2.</span>
                <Plus className="w-3.5 h-3.5 text-blue-500" />
                <span>&quot;홈 화면에 추가&quot; 선택</span>
              </div>
              <p className="text-[10px] text-orange-600 mt-2">
                ⚠️ iOS는 Safari에서만 설치 가능해요 (크롬 X)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
