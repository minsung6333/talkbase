'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ExternalLink, Play, Pause, FileText, AlignLeft, Pencil, Check, X, RefreshCw, Loader2, Zap, Sparkles, SendHorizontal } from 'lucide-react'
import type { Recording, SttResult } from '@/types'

interface Props {
  recording: Recording
}

const QUICK_ACTIONS = [
  { label: '간결하게', instruction: '핵심만 남기고 간결하게 줄여줘' },
  { label: '영어 번역', instruction: '전체 내용을 영어로 번역해줘' },
  { label: '액션아이템만', instruction: '액션아이템과 담당자만 추출해서 체크리스트 형식으로 정리해줘' },
  { label: '표 형식', instruction: '주요 내용을 표 형식으로 정리해줘' },
]

export default function ResultView({ recording }: Props) {
  const [activeTab, setActiveTab] = useState<'ai' | 'stt'>('ai')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState(recording.ai_result || '')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(aiResult)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiEdit, setShowAiEdit] = useState(false)
  const [aiEditInstruction, setAiEditInstruction] = useState('')
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [regenFormat, setRegenFormat] = useState<'minutes' | 'summary'>(recording.output_format as 'minutes' | 'summary')
  const [regenPrompt, setRegenPrompt] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch(`/api/recordings/${recording.id}/audio-url`)
      .then(r => r.json())
      .then(d => setAudioUrl(d.url))
      .catch(() => {})
  }, [recording.id])

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

  // 직접 편집 저장
  const saveEdit = async () => {
    setSaving(true)
    await fetch(`/api/recordings/${recording.id}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiResult: editValue }),
    })
    setAiResult(editValue)
    setIsEditing(false)
    setSaving(false)
  }

  // 빠른 액션
  const runQuickAction = async (instruction: string) => {
    if (!confirm(`"${instruction}"을 적용할까요? 현재 내용이 바뀌어요. (재생성으로 복구 가능)`)) return
    setAiLoading(true)
    const res = await fetch(`/api/recordings/${recording.id}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction }),
    })
    const data = await res.json()
    if (data.aiResult) { setAiResult(data.aiResult); setEditValue(data.aiResult) }
    setAiLoading(false)
  }

  // 재생성
  const runRegenerate = async () => {
    setAiLoading(true)
    setShowRegenModal(false)
    const res = await fetch(`/api/recordings/${recording.id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputFormat: regenFormat, customPrompt: regenPrompt }),
    })
    const data = await res.json()
    if (data.aiResult) { setAiResult(data.aiResult); setEditValue(data.aiResult) }
    setRegenPrompt('')
    setAiLoading(false)
  }

  const sttResult: SttResult[] = recording.stt_result || []

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{recording.title}</h1>
          <p className="text-sm text-gray-500 mt-1" suppressHydrationWarning>
            {new Date(recording.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        {recording.notion_page_url && (
          <a href={recording.notion_page_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors flex-shrink-0">
            <ExternalLink className="w-4 h-4" />Notion에서 보기
          </a>
        )}
      </div>

      {/* 오디오 플레이어 */}
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
          {recording.output_format === 'minutes' ? '회의록' : '요약'}
        </button>
        <button onClick={() => setActiveTab('stt')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
          <AlignLeft className="w-4 h-4" />전문
        </button>
      </div>

      {/* AI 결과물 */}
      {activeTab === 'ai' && (
        <div className="space-y-3">
          {/* 툴바 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {!isEditing ? (
                <>
                  {/* 직접 편집 */}
                  <button onClick={() => { setIsEditing(true); setEditValue(aiResult); setShowAiEdit(false) }}
                    className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> 편집
                  </button>

                  {/* AI 편집 */}
                  <button onClick={() => { setShowAiEdit(!showAiEdit); setIsEditing(false) }}
                    className={`flex items-center gap-1.5 text-sm border px-3 py-1.5 rounded-xl transition-colors ${
                      showAiEdit ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600'
                    }`}>
                    <Sparkles className="w-3.5 h-3.5" /> AI 편집
                  </button>

                  <div className="w-px h-5 bg-gray-200" />

                  {/* 빠른 액션 */}
                  {QUICK_ACTIONS.map(action => (
                    <button key={action.label}
                      onClick={() => runQuickAction(action.instruction)}
                      disabled={aiLoading}
                      className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors disabled:opacity-40">
                      <Zap className="w-3 h-3" /> {action.label}
                    </button>
                  ))}

                  <div className="w-px h-5 bg-gray-200" />

                  {/* 재생성 */}
                  <button onClick={() => setShowRegenModal(true)}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors disabled:opacity-40">
                    <RefreshCw className="w-3.5 h-3.5" /> 재생성
                  </button>
                </>
              ) : (
                <>
                  <button onClick={saveEdit} disabled={saving}
                    className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <X className="w-3.5 h-3.5" /> 취소
                  </button>
                </>
              )}

              {aiLoading && (
                <span className="flex items-center gap-1.5 text-sm text-purple-500 ml-1">
                  <Loader2 className="w-4 h-4 animate-spin" /> AI 처리 중...
                </span>
              )}
            </div>

            {/* AI 편집 입력창 */}
            {showAiEdit && !isEditing && (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={aiEditInstruction}
                  onChange={e => setAiEditInstruction(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && aiEditInstruction.trim()) {
                      runQuickAction(aiEditInstruction)
                      setAiEditInstruction('')
                    }
                    if (e.key === 'Escape') setShowAiEdit(false)
                  }}
                  placeholder="AI에게 수정 지시... (예: 영어로 번역해줘, 더 간결하게, 표로 정리해줘)"
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder-purple-300 text-purple-800"
                />
                <button
                  onClick={() => {
                    if (aiEditInstruction.trim()) {
                      runQuickAction(aiEditInstruction)
                      setAiEditInstruction('')
                    }
                  }}
                  disabled={!aiEditInstruction.trim() || aiLoading}
                  className="flex-shrink-0 text-purple-600 hover:text-purple-800 disabled:opacity-40 transition-colors"
                >
                  <SendHorizontal className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 내용 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {isEditing ? (
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full min-h-[500px] text-sm leading-7 text-gray-800 font-sans resize-none focus:outline-none"
                autoFocus
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-800">
                {aiResult || '생성된 내용이 없어요'}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* STT 전문 */}
      {activeTab === 'stt' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
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
        </div>
      )}

      {/* 재생성 모달 */}
      {showRegenModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-orange-500" /> 재생성
              </h2>
              <button onClick={() => setShowRegenModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500">STT 원본을 기반으로 처음부터 다시 생성해요. 현재 내용은 사라져요.</p>

            {/* 출력 형식 */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">출력 형식</label>
              <div className="grid grid-cols-2 gap-2">
                {(['minutes', 'summary'] as const).map(f => (
                  <button key={f} onClick={() => setRegenFormat(f)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-colors ${regenFormat === f ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {f === 'minutes' ? '📋 회의록' : '📝 요약'}
                  </button>
                ))}
              </div>
            </div>

            {/* 추가 지시사항 */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                추가 지시사항 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <textarea
                value={regenPrompt}
                onChange={e => setRegenPrompt(e.target.value)}
                placeholder={'예) 영어로도 병기해줘\n예) 더 간결하게 요약해줘\n예) 결정사항 위주로 정리해줘'}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRegenModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">
                취소
              </button>
              <button onClick={runRegenerate}
                className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-orange-600 transition-colors">
                재생성 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
