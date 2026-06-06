'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // 이미 닫은 적 있거나 설치된 상태면 노출 안 함
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) return

    // 이미 PWA로 실행 중인지 확인
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // iOS 감지
    const ua = navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua)
    setIsIOS(ios)
    if (ios) {
      // iOS는 자동 프롬프트 이벤트가 없으니 안내만 표시
      setTimeout(() => setShowPrompt(true), 2000)
      return
    }

    // 안드로이드 크롬 등: beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 z-[60] animate-in slide-in-from-bottom">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Download className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">홈 화면에 추가</p>
          <p className="text-xs text-gray-500 mt-0.5">앱처럼 빠르게 사용할 수 있어요</p>

          {isIOS ? (
            <div className="mt-3 text-xs text-gray-600 space-y-1.5 bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <span>1.</span>
                <Share className="w-3.5 h-3.5 text-blue-500" />
                <span>공유 버튼을 눌러주세요</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>2.</span>
                <span>"홈 화면에 추가" 선택</span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              className="mt-3 w-full bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              설치하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
