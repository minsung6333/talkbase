'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Users, ArrowRight } from 'lucide-react'
import type { SttResult } from '@/types'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function SpeakerMappingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: recordingId } = use(params)
  const router = useRouter()
  const [speakers, setSpeakers] = useState<string[]>([])
  const [nameMap, setNameMap] = useState<Record<string, string>>({})
  const [sttResult, setSttResult] = useState<SttResult[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/recordings/${recordingId}/speakers`)
      .then(r => r.json())
      .then(data => {
        setSpeakers(data.speakers || [])
        setSttResult(data.sttResult || [])
        const initial: Record<string, string> = {}
        ;(data.speakers || []).forEach((s: string) => { initial[s] = '' })
        setNameMap(initial)
      })
  }, [recordingId])

  const handleSubmit = async (skip = false) => {
    setSubmitting(true)
    const finalMap = skip ? {} : Object.fromEntries(
      Object.entries(nameMap).filter(([, v]) => v.trim())
    )

    // 1. 화자 매핑 저장
    await fetch(`/api/recordings/${recordingId}/speakers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakerMap: finalMap }),
    })

    // 2. 처리 화면으로 먼저 이동
    router.push(`/processing/${recordingId}`)

    // 3. AI 처리 직접 호출 (클라이언트에서)
    fetch(`/api/process/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId }),
    }).catch(() => {})
  }

  const getDisplayName = (speaker: string) => nameMap[speaker]?.trim() || speaker

  // 화자별 색상
  const COLORS = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-500', 'text-pink-600']
  const speakerColor = (speaker: string) => {
    const idx = speakers.indexOf(speaker)
    return COLORS[idx % COLORS.length] || 'text-gray-600'
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* 왼쪽: 이름 입력 (고정) */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:sticky lg:top-20">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h1 className="font-bold text-gray-900">화자 이름 지정</h1>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                전체 내용을 확인하고 각 화자의 이름을 입력하세요
              </p>

              <div className="space-y-3 mb-5">
                {speakers.map((speaker) => (
                  <div key={speaker} className="flex items-center gap-2">
                    <span className={`text-sm font-medium flex-shrink-0 w-14 ${speakerColor(speaker)}`}>
                      {speaker}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    <input
                      type="text"
                      value={nameMap[speaker] || ''}
                      onChange={(e) => setNameMap(prev => ({ ...prev, [speaker]: e.target.value }))}
                      placeholder="이름 입력"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? '처리 중...' : '적용하고 생성'}
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="w-full border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  이름 없이 생성
                </button>
              </div>
            </div>
          </div>

          {/* 오른쪽: 전체 STT 결과 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-400 mb-4 uppercase tracking-wide">
                전체 전사 내용 ({sttResult.length}개 발화)
              </p>
              <div className="space-y-2">
                {sttResult.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>
                ) : (
                  sttResult.map((item, i) => (
                    <div key={i} className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-300 font-mono flex-shrink-0 w-12 mt-0.5 text-right">
                        {formatTime(item.start_at)}
                      </span>
                      <span className={`text-xs font-semibold flex-shrink-0 w-16 mt-0.5 ${speakerColor(item.speaker)}`}>
                        {getDisplayName(item.speaker)}
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed">{item.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
