'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share, Smartphone, MoreVertical, Plus } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed-at'
const DISMISS_DAYS = 3 // 닫은 후 3일간 재노출 안 함

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 이미 설치된 상태면 스킵
    if (isStandalone()) return

    // 최근에 닫았으면 스킵
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt) {
      const elapsed = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (elapsed < DISMISS_DAYS) return
    }

    const detected = detectPlatform()
    setPlatform(detected)

    // 안드로이드: beforeinstallprompt 대기
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // 모바일: prompt 이벤트 안 와도 5초 후 수동 안내
    if (detected === 'ios' || detected === 'android') {
      const timer = setTimeout(() => {
        if (!deferredPrompt) setShowPrompt(true)
      }, 5000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!showPrompt) return null

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

          {/* 안드로이드: 자동 prompt 사용 가능 */}
          {platform === 'android' && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="mt-3 w-full bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              설치하기
            </button>
          )}

          {/* 안드로이드: prompt 안 뜬 경우 수동 안내 */}
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
                <span>&quot;앱 설치&quot; 또는 &quot;홈 화면에 추가&quot;</span>
              </div>
            </div>
          )}

          {/* iOS: Safari 안내 */}
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
            </div>
          )}

          {/* 데스크탑 */}
          {platform === 'desktop' && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="mt-3 w-full bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              앱으로 설치
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
