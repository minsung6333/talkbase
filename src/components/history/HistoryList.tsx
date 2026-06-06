'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Lock, CheckCircle, Loader2, XCircle, Clock, FileText } from 'lucide-react'

interface RecordingRow {
  id: string
  title: string
  type: string
  visibility: string
  status: string
  output_format: string
  duration_seconds?: number
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  team_meeting: '팀 회의',
  client_meeting: '고객 미팅',
  phone_call: '통화',
  other: '기타',
}

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  completed:      { label: '완료',      icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600' },
  failed:         { label: '실패',      icon: <XCircle className="w-4 h-4" />,     color: 'text-red-500' },
  stt_processing: { label: 'STT 중',    icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-500' },
  ai_processing:  { label: 'AI 정리 중', icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-500' },
  speaker_mapping:{ label: '화자 지정',  icon: <Clock className="w-4 h-4" />,      color: 'text-yellow-500' },
  uploading:      { label: '업로드 중',  icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-gray-500' },
  saving:         { label: '저장 중',   icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-500' },
}

function formatDuration(seconds?: number) {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}분 ${s > 0 ? `${s}초` : ''}`
}

function RecordingCard({ r }: { r: RecordingRow }) {
  const status = STATUS_MAP[r.status] || { label: r.status, icon: null, color: 'text-gray-500' }
  const isClickable = r.status === 'completed'

  const content = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-colors ${isClickable ? 'cursor-pointer hover:shadow-sm' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {r.visibility === 'team'
              ? <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              : <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            }
            <span className="text-xs text-gray-400">{TYPE_LABEL[r.type] || r.type}</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">
              {r.output_format === 'minutes' ? '회의록' : '요약'}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 truncate">{r.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">
              {new Date(r.created_at).toLocaleDateString('ko-KR')}
            </span>
            {formatDuration(r.duration_seconds) && (
              <span className="text-xs text-gray-400">{formatDuration(r.duration_seconds)}</span>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${status.color}`}>
          {status.icon}
          <span>{status.label}</span>
        </div>
      </div>
    </div>
  )

  if (isClickable) {
    return <Link href={`/result/${r.id}`}>{content}</Link>
  }
  return content
}

export default function HistoryList({
  teamRecordings,
  myRecordings,
}: {
  teamRecordings: RecordingRow[]
  myRecordings: RecordingRow[]
}) {
  const [tab, setTab] = useState<'team' | 'my'>('team')

  const list = tab === 'team' ? teamRecordings : myRecordings

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('team')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'team' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          <Users className="w-4 h-4" />
          팀 공유 ({teamRecordings.length})
        </button>
        <button
          onClick={() => setTab('my')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          <Lock className="w-4 h-4" />
          내 녹음 ({myRecordings.length})
        </button>
      </div>

      {/* 목록 */}
      {list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">아직 처리된 녹음이 없어요</p>
          <Link href="/" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            첫 번째 녹음 업로드하기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(r => <RecordingCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  )
}
