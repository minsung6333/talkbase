'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, FileText, AlignLeft } from 'lucide-react'
import type { SttResult } from '@/types'
import { TEMPLATES } from '@/lib/templates'

interface SharedRecording {
  id: string
  title: string
  type: string
  output_format: string
  ai_result?: string | null
  stt_result?: SttResult[] | null
  created_at: string
}

interface Props {
  recording: SharedRecording
  shareToken: string
}

export default function SharedView({ recording, shareToken }: Props) {
  const [activeTab, setActiveTab] = useState<'ai' | 'stt'>('ai')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch(`/api/share/${shareToken}/audio-url`)
      .then(r => r.json())
      .then(d => setAudioUrl(d.url))
      .catch(() => {})
  }, [shareToken])

  const handleTimestampClick = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    const seek = () => {
      audio.currentTime = seconds
      audio.play()
      setIsPlaying(true)
    }
    if (audio.readyState >= 1) seek()
    else { audio.addEventListener('loadedmetadata', seek, { once: true }); audio.load() }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play(); setIsPlaying(true) }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const sttResult: SttResult[] = recording.stt_result || []

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{recording.title}</h1>
        <p className="text-sm text-gray-500 mt-1" suppressHydrationWarning>
          {new Date(recording.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* 오디오 */}
      {audioUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <audio ref={audioRef} src={audioUrl}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onEnded={() => setIsPlaying(false)} className="hidden" />
          <div className="flex items-center gap-3">
            <button onClick={togglePlay}
              className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-blue-700 transition-colors">
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
            </button>
            <div className="flex-1">
              <input type="range" min={0} max={audioRef.current?.duration || 0} value={currentTime}
                onChange={e => {
                  if (audioRef.current) audioRef.current.currentTime = Number(e.target.value)
                  setCurrentTime(Number(e.target.value))
                }}
                className="w-full accent-blue-600" />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0 w-10 text-right font-mono">{formatTime(currentTime)}</span>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
          <FileText className="w-4 h-4" />
          {TEMPLATES[recording.output_format as keyof typeof TEMPLATES]?.name || '회의록'}
        </button>
        <button onClick={() => setActiveTab('stt')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
          <AlignLeft className="w-4 h-4" />전문
        </button>
      </div>

      {/* 컨텐츠 (편집 불가, 읽기만) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {activeTab === 'ai' ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-800">
            {recording.ai_result || '내용이 없어요'}
          </pre>
        ) : (
          <div className="space-y-1">
            {sttResult.length === 0 ? (
              <p className="text-gray-400 text-sm">전사 결과가 없어요</p>
            ) : (
              sttResult.map((item, i) => (
                <div key={i} className="flex gap-3 py-1.5 group">
                  <button onClick={() => handleTimestampClick(item.start_at)}
                    className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 w-14 text-right font-mono mt-0.5 hover:underline">
                    {formatTime(item.start_at)}
                  </button>
                  <span className="text-sm font-medium text-gray-700 flex-shrink-0 w-20 truncate">{item.speaker}</span>
                  <span className="text-sm text-gray-600 leading-relaxed">{item.text}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="text-center py-6">
        <p className="text-xs text-gray-300">
          이 페이지는 읽기 전용으로 공유됐어요
        </p>
      </div>
    </div>
  )
}
