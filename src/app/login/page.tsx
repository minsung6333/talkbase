'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { FileAudio, Users, Sparkles, CheckSquare } from 'lucide-react'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'

const FEATURES = [
  { icon: FileAudio, label: '정확한 STT' },
  { icon: Users,     label: '화자 분리' },
  { icon: Sparkles,  label: 'AI 요약' },
  { icon: CheckSquare, label: '액션 아이템' },
]

const STEPS = [
  {
    step: '01',
    title: '녹음 파일 업로드',
    desc: '갤럭시 녹음 파일을\n그대로 올려요',
    icon: '🎙',
  },
  {
    step: '02',
    title: 'STT & 화자 분리',
    desc: '누가 무슨 말을 했는지\n자동으로 구분해요',
    icon: '✍️',
  },
  {
    step: '03',
    title: 'AI 회의록 완성',
    desc: '요약, 결정사항, 액션아이템을\n한번에 정리해요',
    icon: '✨',
  },
]

export default function LoginPage() {
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
      <header className="px-6 py-5 flex items-center">
        <TalkBaseLogo variant="wordmark" size={28} />
      </header>

      {/* 메인 */}
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-16 pt-8 lg:pt-14">

          {/* 좌측: 히어로 */}
          <div className="flex-1 space-y-8">
            {/* 배지 */}
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-4 py-1.5 text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              AI가 회의의 모든 순간을 기록하고 정리해드려요
            </div>

            {/* 헤드카피 */}
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
                회의는 더 집중하고,
              </h1>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                정리는{' '}
                <span className="text-blue-600">AI에게</span>{' '}
                맡기세요
              </h1>
            </div>

            {/* 서브카피 */}
            <p className="text-gray-500 text-lg leading-relaxed">
              음성 파일을 업로드하면 AI가 자동으로 회의록을 작성하고<br className="hidden sm:inline" />
              요약, 액션 아이템까지 한 번에 정리해 드립니다.
            </p>

            {/* 기능 태그 */}
            <div className="flex flex-wrap gap-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-600 shadow-sm">
                  <Icon className="w-3.5 h-3.5 text-blue-500" />
                  {label}
                </div>
              ))}
            </div>

            {/* 3단계 플로우 */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {STEPS.map((s, i) => (
                <div key={s.step} className="relative">
                  {/* 연결선 */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-6 left-[calc(100%-8px)] w-full h-px bg-gradient-to-r from-blue-200 to-transparent z-0" />
                  )}
                  <div className="relative bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-xs font-bold text-blue-400 mb-1">{s.step}</div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">{s.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 로그인 카드 */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              {/* 로고 */}
              <div className="flex justify-center mb-6">
                <TalkBaseLogo variant="icon-filled" size={72} className="rounded-2xl shadow-lg shadow-blue-200" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-1 tracking-tight">
                TalkBase
              </h2>
              <p className="text-gray-400 text-sm text-center mb-8">
                녹음된 대화를 업무 지식으로 바꾸다
              </p>

              {/* 구글 로그인 버튼 */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google 계정으로 로그인
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300">또는</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* 접근 안내 */}
              <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center">
                <p className="text-xs text-gray-500">
                  🔒 초대받은 팀원만 사용할 수 있어요
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  관리자에게 초대를 요청하세요
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
