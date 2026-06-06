'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react'
import type { ProcessingStatus as TStatus } from '@/types'

const STEPS: { key: TStatus; label: string; description: string }[] = [
  { key: 'uploading',      label: '업로드',         description: '파일을 서버에 저장하고 있어요' },
  { key: 'stt_processing', label: 'STT 변환',        description: '음성을 텍스트로 변환하고 있어요 (3~10분)' },
  { key: 'speaker_mapping',label: '화자 이름 지정',   description: '화자 이름을 확인해주세요' },
  { key: 'ai_processing',  label: 'AI 정리',         description: '회의록/요약을 작성하고 있어요' },
  { key: 'saving',         label: '저장 및 발송',     description: 'Notion 저장 및 이메일 발송 중이에요' },
  { key: 'completed',      label: '완료',            description: '모든 처리가 끝났어요!' },
]

const STATUS_ORDER: TStatus[] = [
  'uploading', 'stt_pending', 'stt_processing',
  'speaker_mapping', 'ai_processing', 'saving', 'completed'
]

function getStepState(stepKey: TStatus, currentStatus: TStatus) {
  const stepIdx = STATUS_ORDER.indexOf(stepKey)
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  if (currentStatus === 'failed') return 'error'
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'active'
  return 'pending'
}

export default function ProcessingStatus({ recordingId }: { recordingId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<TStatus>('uploading')
  const [title, setTitle] = useState('')

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/recordings/${recordingId}/status`)
        if (!res.ok) return
        const data = await res.json()
        setStatus(data.status)
        setTitle(data.title)

        if (data.status === 'speaker_mapping') {
          router.push(`/processing/${recordingId}/speakers`)
          return
        }
        if (data.status === 'completed') {
          router.push(`/result/${recordingId}`)
          return
        }
        if (data.status === 'failed') return
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [recordingId, router])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">처리 중</h1>
        {title && <p className="text-gray-500 mt-1 text-sm">{title}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="space-y-6">
          {STEPS.map((step, i) => {
            const state = getStepState(step.key, status)
            return (
              <div key={step.key} className="flex items-start gap-4">
                {/* 아이콘 */}
                <div className="flex-shrink-0 mt-0.5">
                  {state === 'done' && <CheckCircle className="w-6 h-6 text-green-500" />}
                  {state === 'active' && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
                  {state === 'pending' && <Circle className="w-6 h-6 text-gray-200" />}
                  {state === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
                </div>

                {/* 내용 */}
                <div className={`flex-1 ${state === 'pending' ? 'opacity-40' : ''}`}>
                  <p className={`font-medium text-sm ${
                    state === 'active' ? 'text-blue-700' :
                    state === 'done'   ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                  {state === 'active' && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {status === 'stt_processing' && (
          <div className="mt-6 pt-6 border-t border-gray-50">
            <p className="text-xs text-gray-400 text-center">
              업로드가 완료됐어요. 이 화면을 닫아도 처리는 계속돼요 ✓
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="mt-6 pt-6 border-t border-gray-50 text-center space-y-3">
            <p className="text-sm text-red-500">처리 중 오류가 발생했어요</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-blue-600 hover:underline"
            >
              다시 업로드하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
