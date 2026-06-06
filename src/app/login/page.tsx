'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileAudio, Users, Sparkles, CheckSquare, X, Loader2, Check, HelpCircle, Smartphone } from 'lucide-react'
import Link from 'next/link'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'

const FEATURES = [
  { icon: FileAudio, label: '정확한 STT' },
  { icon: Users,     label: '화자 분리' },
  { icon: Sparkles,  label: 'AI 요약' },
  { icon: CheckSquare, label: '액션 아이템' },
]

const STEPS = [
  { step: '01', title: '녹음 파일 업로드', desc: '갤럭시 녹음 파일을\n그대로 올려요', icon: '🎙' },
  { step: '02', title: 'STT & 화자 분리', desc: '누가 무슨 말을 했는지\n자동으로 구분해요', icon: '✍️' },
  { step: '03', title: 'AI 회의록 완성', desc: '요약, 결정사항, 액션아이템을\n한번에 정리해요', icon: '✨' },
]

export default function LoginPage() {
  const [showRequestModal, setShowRequestModal] = useState(false)

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
      {/* 헤더 */}
      <header className="px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
        <TalkBaseLogo variant="wordmark" size={26} />
        <Link href="/help/install"
          className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-xl px-3 py-1.5 transition-colors">
          <Smartphone className="w-3.5 h-3.5" />
          앱 설치
        </Link>
      </header>

      {/* 메인 */}
      <main className="max-w-6xl mx-auto px-5 sm:px-6 pb-16">
        <div className="flex flex-col lg:flex-row lg:items-center gap-10 sm:gap-12 lg:gap-16 pt-4 lg:pt-14">

          {/* 우측 로그인 카드 (모바일 우선 노출) */}
          <div className="order-1 lg:order-2 lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
              {/* 로고 */}
              <div className="flex justify-center mb-5 sm:mb-6">
                <TalkBaseLogo variant="icon-filled" size={64} className="rounded-2xl shadow-lg shadow-blue-200" />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-1 tracking-tight">
                TalkBase
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm text-center mb-6 sm:mb-8">
                녹음된 대화를 업무 지식으로 바꾸다
              </p>

              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 sm:py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google 계정으로 로그인
              </button>

              <div className="flex items-center gap-3 my-4 sm:my-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300">또는</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center mb-3">
                <p className="text-xs text-gray-500">
                  🔒 초대받은 팀원만 사용할 수 있어요
                </p>
              </div>

              <button
                onClick={() => setShowRequestModal(true)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 transition-colors"
              >
                + 사용 요청하기
              </button>
            </div>

            {/* 모바일에서 도움말 링크 */}
            <div className="text-center mt-4 lg:hidden">
              <Link href="/help/install"
                className="text-xs text-gray-400 hover:text-blue-600 inline-flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> 앱 설치 가이드 (iPhone / 갤럭시)
              </Link>
            </div>
          </div>

          {/* 좌측 히어로 */}
          <div className="order-2 lg:order-1 flex-1 space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              AI가 회의의 모든 순간을 기록해드려요
            </div>

            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
                회의는 더 집중하고,
              </h1>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                정리는{' '}
                <span className="text-blue-600">AI에게</span>{' '}
                맡기세요
              </h1>
            </div>

            <p className="text-gray-500 text-sm sm:text-base lg:text-lg leading-relaxed">
              음성 파일을 업로드하면 AI가 자동으로 회의록을 작성하고<br className="hidden sm:inline" />
              요약, 액션 아이템까지 한 번에 정리해 드립니다.
            </p>

            {/* 기능 태그 */}
            <div className="flex flex-wrap gap-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs sm:text-sm text-gray-600 shadow-sm">
                  <Icon className="w-3.5 h-3.5 text-blue-500" />
                  {label}
                </div>
              ))}
            </div>

            {/* 3단계 플로우 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
              {STEPS.map((s, i) => (
                <div key={s.step} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-6 left-[calc(100%-8px)] w-full h-px bg-gradient-to-r from-blue-200 to-transparent z-0" />
                  )}
                  <div className="relative bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-sm">
                    <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{s.icon}</div>
                    <div className="text-[10px] sm:text-xs font-bold text-blue-400 mb-1">{s.step}</div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-1 leading-tight">{s.title}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 leading-relaxed whitespace-pre-line hidden sm:block">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* 사용 요청 모달 */}
      {showRequestModal && (
        <AccessRequestModal onClose={() => setShowRequestModal(false)} />
      )}
    </div>
  )
}

function AccessRequestModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', role: '', purpose: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('이름과 이메일은 필수예요')
      return
    }
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/access-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) setSubmitted(true)
    else setError(data.error || '요청 실패')
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {submitted ? (
          // 완료 화면
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">요청을 보냈어요!</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              관리자가 확인 후 곧 초대해드릴 거예요.<br />
              확인까지 영업일 기준 1~2일 정도 걸려요.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white rounded-2xl py-3 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              확인
            </button>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">사용 요청하기</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 leading-relaxed">
                간단한 정보를 남겨주시면 관리자가 확인 후 초대해드려요.
              </p>

              <Field label="이름" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="홍길동"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </Field>

              <Field label="이메일" required hint="이 이메일로 초대장이 와요. Google 계정으로 등록해주세요.">
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="hong@company.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </Field>

              <Field label="소속 (회사·기관)">
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                  placeholder="예) 클라비"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </Field>

              <Field label="직책">
                <input
                  type="text"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  placeholder="예) 기획팀 매니저"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </Field>

              <Field label="사용 목적">
                <textarea
                  value={form.purpose}
                  onChange={e => setForm({ ...form, purpose: e.target.value })}
                  rows={3}
                  placeholder="어떤 회의를 정리하고 싶으신가요?"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </Field>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">❌ {error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white rounded-2xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> 보내는 중...</>
                  : '요청 보내기'
                }
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  label, required, hint, children
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}
