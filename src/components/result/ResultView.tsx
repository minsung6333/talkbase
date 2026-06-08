'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Play, Pause, FileText, AlignLeft, Pencil, Check, X, RefreshCw, Loader2, Zap, Sparkles, SendHorizontal, Mail, Share2, Copy, Globe, Briefcase, MoreHorizontal, Trash2 } from 'lucide-react'
import type { Recording, SttResult } from '@/types'
import { TEMPLATES } from '@/lib/templates'
import { groupSttBySpeaker } from '@/lib/stt'

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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'ai' | 'stt'>('ai')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement | null>(null)

  // 제목 편집
  const [title, setTitle] = useState(recording.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(recording.title)
  const [savingTitle, setSavingTitle] = useState(false)
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
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState('')

  // 보고서 모달 상태
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportAddressee, setReportAddressee] = useState('부서장님')
  const [reportEmail, setReportEmail] = useState('')
  const [reportCustomPrompt, setReportCustomPrompt] = useState('')
  const [reportIncludeShare, setReportIncludeShare] = useState(true)
  const [reportText, setReportText] = useState('')
  const [reportEditing, setReportEditing] = useState(false)
  const [reportGenerating, setReportGenerating] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportCopied, setReportCopied] = useState(false)
  const [reportStatus, setReportStatus] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareEnabled, setShareEnabled] = useState(false)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch(`/api/recordings/${recording.id}/audio-url`)
      .then(r => r.json())
      .then(d => setAudioUrl(d.url))
      .catch(() => {})
  }, [recording.id])

  useEffect(() => {
    setShareToken(recording.share_token || null)
    setShareEnabled(!!recording.share_enabled)
  }, [recording.share_token, recording.share_enabled])

  // 메일 다시 보내기
  const handleResend = async () => {
    setResending(true)
    const res = await fetch(`/api/recordings/${recording.id}/resend`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setResendDone(`✓ ${data.to}로 발송됐어요`)
      setTimeout(() => setResendDone(''), 4000)
    } else {
      setResendDone(`❌ ${data.error}`)
    }
    setResending(false)
  }

  // 공유 활성화
  const enableShare = async () => {
    const res = await fetch(`/api/recordings/${recording.id}/share`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setShareToken(data.token)
      setShareEnabled(true)
    }
  }

  // 공유 비활성화
  const disableShare = async () => {
    if (!confirm('공유를 해제할까요? 현재 링크로는 더 이상 접근할 수 없게 돼요.')) return
    const res = await fetch(`/api/recordings/${recording.id}/share`, { method: 'DELETE' })
    if (res.ok) setShareEnabled(false)
  }

  const shareUrl = shareToken && typeof window !== 'undefined'
    ? `${window.location.origin}/share/${shareToken}`
    : ''

  const copyShareUrl = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // OS 네이티브 공유 시트 (카톡, 메시지, 메일 등 자동)
  const nativeShare = async () => {
    if (!shareUrl) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${recording.title} · TalkBase`,
          text: `${recording.title} - TalkBase에서 공유된 회의록`,
          url: shareUrl,
        })
      } catch (err) {
        // 사용자가 취소하면 AbortError. 다른 에러면 복사 폴백
        if (err instanceof Error && err.name !== 'AbortError') {
          copyShareUrl()
        }
      }
    } else {
      // 네이티브 공유 미지원 시 복사 폴백
      copyShareUrl()
    }
  }

  // 보고서 모달 열 때 기본 이메일 자동 채우기
  const openReportModal = async () => {
    setShowReportModal(true)
    setReportText('')
    setReportStatus('')
    if (!reportEmail) {
      try {
        const res = await fetch('/api/profile')
        const profile = await res.json()
        setReportEmail(profile.notification_email || profile.email || '')
      } catch {}
    }
  }

  // 보고서 생성 (메일 발송 없이 미리보기만)
  const generateReport = async () => {
    if (!reportAddressee.trim()) return
    setReportGenerating(true)
    setReportStatus('')

    const res = await fetch(`/api/recordings/${recording.id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addressee: reportAddressee,
        customPrompt: reportCustomPrompt,
        includeShareLink: reportIncludeShare,
        sendEmail: false,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setReportText(data.report)
      setReportEditing(false)
    } else {
      setReportStatus(`❌ ${data.error || '생성 실패'}`)
    }
    setReportGenerating(false)
  }

  // 메일로 보고서 발송
  const sendReport = async () => {
    if (!reportEmail.trim() || !reportText.trim()) return
    setReportSending(true)
    setReportStatus('')

    const res = await fetch(`/api/recordings/${recording.id}/report-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportText,
        emailTo: reportEmail,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setReportStatus(`✓ ${reportEmail}로 발송됐어요`)
      setTimeout(() => {
        setShowReportModal(false)
        setReportStatus('')
      }, 1500)
    } else {
      setReportStatus(`❌ ${data.error || '발송 실패'}`)
    }
    setReportSending(false)
  }

  // 보고서 복사
  const copyReport = async () => {
    if (!reportText) return
    await navigator.clipboard.writeText(reportText)
    setReportCopied(true)
    setTimeout(() => setReportCopied(false), 2000)
  }

  // 더보기 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!moreMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreMenuOpen])

  const handleSaveTitle = async () => {
    const t = titleInput.trim()
    if (!t || t === title) { setEditingTitle(false); setTitleInput(title); return }
    setSavingTitle(true)
    const res = await fetch(`/api/recordings/${recording.id}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t }),
    })
    setSavingTitle(false)
    if (res.ok) {
      setTitle(t)
      setEditingTitle(false)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(`제목 변경 실패: ${d.error || '알 수 없는 오류'}`)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${recording.title}" 녹음을 삭제할까요?\n\n• AI 회의록 + STT 전문 + 오디오 파일 모두 삭제\n• 되돌릴 수 없어요`)) {
      return
    }
    setDeleting(true)
    setMoreMenuOpen(false)
    const res = await fetch(`/api/recordings/${recording.id}/delete`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/history')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(`삭제 실패: ${d.error || '알 수 없는 오류'}`)
      setDeleting(false)
    }
  }

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
  const sttGroups = useMemo(() => groupSttBySpeaker(sttResult), [sttResult])

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 헤더 — 제목 영역 + 더보기 메뉴 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') { setEditingTitle(false); setTitleInput(title) }
                }}
                className="flex-1 text-xl sm:text-2xl font-bold text-gray-900 leading-tight border-b-2 border-blue-500 focus:outline-none bg-transparent py-1"
              />
              <button onClick={handleSaveTitle} disabled={savingTitle}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50">
                {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={() => { setEditingTitle(false); setTitleInput(title) }}
                className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-2 w-full text-left group hover:opacity-80 transition-opacity"
              aria-label="제목 편집"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight truncate">{title}</h1>
              <Pencil className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          )}
          <p className="text-xs sm:text-sm text-gray-500 mt-1" suppressHydrationWarning>
            {new Date(recording.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>

        <div className="relative flex-shrink-0" ref={moreMenuRef}>
          <button
            onClick={() => setMoreMenuOpen(v => !v)}
            disabled={deleting}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            aria-label="더보기"
          >
            {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MoreHorizontal className="w-5 h-5" />}
          </button>
          {moreMenuOpen && (
            <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-xl shadow-lg z-10 w-44 py-1">
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 녹음 삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 액션 버튼 — 모바일에선 풀너비 그리드, 데스크탑에선 인라인 */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
        <button
          onClick={openReportModal}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-3 py-2.5 sm:py-2 font-medium transition-colors"
        >
          <Briefcase className="w-4 h-4" />
          보고서 보내기
        </button>
        <button
          onClick={handleResend}
          disabled={resending}
          className="flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 sm:py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          메일
        </button>
        <button
          onClick={() => setShowShareModal(true)}
          className={`flex items-center justify-center gap-1.5 text-sm rounded-xl px-3 py-2.5 sm:py-2 transition-colors ${
            shareEnabled
              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              : 'text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Share2 className="w-4 h-4" />
          {shareEnabled ? '공유 중' : '공유'}
        </button>
        {/* Notion 링크는 내부 아카이브용으로 숨김 */}
      </div>

      {resendDone && (
        <div className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm">{resendDone}</div>
      )}

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
          {TEMPLATES[recording.output_format as keyof typeof TEMPLATES]?.name || '회의록'}
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
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide flex-wrap">
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

      {/* STT 전문 — 같은 화자의 연속 발화는 5초 이내 갭이면 한 블록으로 묶음 */}
      {activeTab === 'stt' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div className="divide-y divide-gray-50 sm:divide-y-0 sm:space-y-3">
            {sttGroups.length === 0 ? (
              <p className="text-gray-400 text-sm">전사 결과가 없어요</p>
            ) : (
              sttGroups.map((g, i) => (
                <div key={i} className="py-4 sm:py-2 sm:flex sm:gap-3 sm:items-start">
                  {/* 모바일: 위에 시간+화자 한 줄 */}
                  <div className="flex items-center gap-2 sm:hidden mb-1.5">
                    <button onClick={() => handleTimestampClick(g.start_at)}
                      className="text-xs text-blue-500 hover:text-blue-700 font-mono hover:underline flex-shrink-0">
                      {formatTime(g.start_at)}
                    </button>
                    <span className="text-xs font-semibold text-gray-700">{g.speaker}</span>
                  </div>

                  {/* 데스크탑: 시간 / 화자 / 텍스트 가로 정렬 */}
                  <button onClick={() => handleTimestampClick(g.start_at)}
                    className="hidden sm:block text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 w-14 text-right font-mono mt-0.5 hover:underline">
                    {formatTime(g.start_at)}
                  </button>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 flex-shrink-0 w-20 truncate">{g.speaker}</span>

                  {/* 텍스트 — 묶인 본문 */}
                  <p className="text-sm text-gray-700 sm:text-gray-600 leading-relaxed sm:flex-1 whitespace-pre-wrap">{g.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 보고서 모달 */}
      {showReportModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" /> 보고용 메일 작성
              </h2>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!reportText ? (
                // 옵션 입력 화면
                <>
                  <p className="text-sm text-gray-500">
                    상사에게 보고용으로 다시 정리해드려요. 화자 구분 없이 논의 흐름과 결정/액션 위주로 정리됩니다.
                  </p>

                  {/* 수신 호칭 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      수신 호칭 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={reportAddressee}
                      onChange={e => setReportAddressee(e.target.value)}
                      placeholder="예: 부서장님, 대표님, 팀장님"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {['부서장님', '대표님', '팀장님', '본부장님'].map(s => (
                        <button
                          key={s}
                          onClick={() => setReportAddressee(s)}
                          className="text-xs text-gray-500 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg px-2.5 py-1 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 추가 요청 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      추가 요청 <span className="text-gray-400 font-normal">(선택)</span>
                    </label>
                    <textarea
                      value={reportCustomPrompt}
                      onChange={e => setReportCustomPrompt(e.target.value)}
                      placeholder="예) 우리 팀 입장을 강조해줘 / 영어로 작성해줘 / 최대한 짧게"
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* 공유 링크 포함 */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportIncludeShare}
                      onChange={e => setReportIncludeShare(e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">공유 링크 포함</p>
                      <p className="text-xs text-gray-400">상세 회의록 링크가 보고서에 자동 삽입돼요</p>
                    </div>
                  </label>

                  {/* 생성 버튼 */}
                  <button
                    onClick={generateReport}
                    disabled={reportGenerating || !reportAddressee.trim()}
                    className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {reportGenerating
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> 작성 중...</>
                      : <><Sparkles className="w-4 h-4" /> 보고서 생성</>
                    }
                  </button>

                  {reportStatus && (
                    <p className="text-sm text-center text-gray-500">{reportStatus}</p>
                  )}
                </>
              ) : (
                // 미리보기 / 발송 화면
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">미리보기</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReportEditing(!reportEditing)}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                      >
                        {reportEditing ? <><Check className="w-3 h-3" /> 완료</> : <><Pencil className="w-3 h-3" /> 편집</>}
                      </button>
                      <button
                        onClick={() => { setReportText(''); setReportEditing(false) }}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> 다시 만들기
                      </button>
                    </div>
                  </div>

                  {reportEditing ? (
                    <textarea
                      value={reportText}
                      onChange={e => setReportText(e.target.value)}
                      rows={18}
                      className="w-full border border-blue-300 rounded-xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4 max-h-[400px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                        {reportText}
                      </pre>
                    </div>
                  )}

                  {/* 수신 이메일 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">수신 이메일</label>
                    <input
                      type="email"
                      value={reportEmail}
                      onChange={e => setReportEmail(e.target.value)}
                      placeholder="boss@company.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {reportStatus && (
                    <p className="text-sm text-center text-gray-500">{reportStatus}</p>
                  )}
                </>
              )}
            </div>

            {/* 푸터 액션 */}
            {reportText && (
              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={copyReport}
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  {reportCopied
                    ? <><Check className="w-4 h-4 text-green-500" /> 복사됨</>
                    : <><Copy className="w-4 h-4" /> 복사</>
                  }
                </button>
                <button
                  onClick={sendReport}
                  disabled={reportSending || !reportEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {reportSending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> 발송 중...</>
                    : <><Mail className="w-4 h-4" /> 메일로 발송</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 공유 모달 */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-500" /> 공유하기
              </h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!shareEnabled ? (
              <>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">읽기 전용 공개 링크</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1 ml-6">
                    <li>· 링크가 있는 누구나 볼 수 있어요</li>
                    <li>· 받은 사람은 수정할 수 없어요</li>
                    <li>· 언제든 공유를 해제할 수 있어요</li>
                  </ul>
                </div>
                <button
                  onClick={enableShare}
                  className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  공유 링크 생성
                </button>
              </>
            ) : (
              <>
                {/* OS 공유 버튼 (메인) */}
                <button
                  onClick={nativeShare}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  공유하기 (카톡 / 메시지 / 메일...)
                </button>

                {/* URL 표시 + 복사 (보조) */}
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">공유 링크</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 pl-3">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none truncate"
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={copyShareUrl}
                      className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
                    >
                      {copied
                        ? <><Check className="w-3.5 h-3.5 text-green-500" /> 복사됨</>
                        : <><Copy className="w-3.5 h-3.5" /> 복사</>
                      }
                    </button>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700">
                  ✓ 받은 사람은 읽기만 가능하고 수정할 수 없어요
                </div>

                <button
                  onClick={disableShare}
                  className="w-full border border-red-200 text-red-500 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  공유 해제
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 재생성 모달 */}
      {showRegenModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRegenModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
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
