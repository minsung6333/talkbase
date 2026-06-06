'use client'

import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** 모바일에서 하단 슬라이드 시트 스타일 */
  bottomSheet?: boolean
  /** max-width tailwind class (예: max-w-md) */
  maxWidth?: string
  /** 바깥 클릭으로 닫기 비활성화 */
  disableBackdropClose?: boolean
}

/**
 * 공통 모달:
 *  - 바깥 클릭으로 닫기
 *  - ESC 키로 닫기
 *  - 스크롤 잠금
 *  - 하단 슬라이드 시트 옵션 (bottomSheet)
 */
export default function Modal({
  open,
  onClose,
  children,
  bottomSheet = false,
  maxWidth = 'max-w-md',
  disableBackdropClose = false,
}: Props) {
  useEffect(() => {
    if (!open) return

    // ESC 키
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    // 스크롤 잠금
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const containerClasses = bottomSheet
    ? 'fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'
    : 'fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'

  const panelClasses = bottomSheet
    ? `bg-white w-full sm:${maxWidth} rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] flex flex-col`
    : `bg-white w-full ${maxWidth} rounded-2xl shadow-xl max-h-[90vh] flex flex-col`

  return (
    <div
      className={containerClasses}
      onClick={() => { if (!disableBackdropClose) onClose() }}
    >
      <div
        className={panelClasses}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}
