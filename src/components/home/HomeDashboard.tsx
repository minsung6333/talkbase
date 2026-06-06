'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mic, ChevronRight, Clock, FileText, Folder, Users, Lock, Loader2, CheckCircle, BarChart2 } from 'lucide-react'

interface Recording {
  id: string
  title: string
  type: string
  status: string
  output_format: string
  duration_seconds?: number
  created_at: string
  visibility: string
}

interface Project {
  id: string
  name: string
  space: 'team' | 'personal'
}

interface HomeData {
  recentRecordings: Recording[]
  weekStats: { count: number; duration: string | null }
  projects: Project[]
  userName: string
}

const TYPE_LABEL: Record<string, string> = {
  team_meeting: '팀 회의',
  client_meeting: '고객 미팅',
  one_on_one: '1:1',
  other: '기타',
}

function formatDuration(seconds?: number) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '좋은 아침이에요'
  if (hour < 18) return '좋은 오후예요'
  return '좋은 저녁이에요'
}

export default function HomeDashboard() {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/home')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 인사말 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900" suppressHydrationWarning>
          {getGreeting()}, {data?.userName}님 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {data?.weekStats.count
            ? `이번 주 ${data.weekStats.count}건의 회의${data.weekStats.duration ? ` · ${data.weekStats.duration}` : ''}`
            : '이번 주 첫 번째 회의를 기록해보세요'}
        </p>
      </div>

      {/* 빠른 업로드 */}
      <Link href="/upload"
        className="flex items-center gap-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-5 transition-colors group">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Mic className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-lg">녹음 파일 업로드</p>
          <p className="text-blue-200 text-sm mt-0.5">m4a, mp3, wav · 최대 2GB</p>
        </div>
        <ChevronRight className="w-5 h-5 text-blue-300 group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* 주간 통계 */}
      {data?.weekStats && data.weekStats.count > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400 font-medium">이번 주 회의</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.weekStats.count}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400 font-medium">총 회의 시간</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.weekStats.duration || '-'}</p>
          </div>
        </div>
      )}

      {/* 최근 녹음 */}
      {data?.recentRecordings && data.recentRecordings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">최근 녹음</h2>
            <Link href="/history" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              전체 보기 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recentRecordings.map(r => (
              <Link key={r.id} href={`/result/${r.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                    {TYPE_LABEL[r.type] || r.type}
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                </div>
                <h3 className="font-medium text-gray-900 text-sm leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {r.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {formatDuration(r.duration_seconds) && (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(r.duration_seconds)}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 프로젝트 바로가기 */}
      {data?.projects && data.projects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">프로젝트</h2>
            <Link href="/history" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              전체 보기 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {data.projects.map(p => (
              <Link key={p.id} href="/history"
                className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-700 hover:border-blue-200 hover:text-blue-600 transition-colors">
                {p.space === 'team'
                  ? <Users className="w-3.5 h-3.5 text-blue-400" />
                  : <Lock className="w-3.5 h-3.5 text-gray-400" />
                }
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 처음 쓰는 경우 */}
      {data?.recentRecordings?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Mic className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">아직 녹음이 없어요</p>
          <p className="text-gray-400 text-sm mt-1">첫 번째 회의를 업로드해보세요</p>
          <Link href="/upload"
            className="inline-flex items-center gap-2 mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Mic className="w-4 h-4" /> 업로드 시작
          </Link>
        </div>
      )}
    </div>
  )
}
