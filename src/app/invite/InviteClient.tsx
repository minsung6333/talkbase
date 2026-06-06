'use client'

import { createClient } from '@/lib/supabase/client'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'
import Link from 'next/link'

interface Props {
  token: string
  workspaceName: string
  inviterName: string
  invitedEmail: string
  error?: string
  expectedEmail?: string
}

export default function InviteClient({
  token,
  workspaceName,
  inviterName,
  invitedEmail,
  error,
  expectedEmail,
}: Props) {
  const handleGoogleLogin = async () => {
    const supabase = createClient()
    const appUrl = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/auth/callback?invite_token=${token}`,
        queryParams: { login_hint: invitedEmail },
      },
    })
  }

  if (error === 'expired') {
    return (
      <InviteLayout>
        <div className="text-center space-y-4">
          <div className="text-5xl">😢</div>
          <h2 className="text-xl font-bold text-gray-900">초대가 만료됐어요</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            이 초대 링크는 유효 기간이 지났거나 이미 사용됐어요.<br />
            초대한 분께 다시 요청해주세요.
          </p>
          <Link href="/login"
            className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            로그인 페이지로 →
          </Link>
        </div>
      </InviteLayout>
    )
  }

  if (error === 'email_mismatch') {
    return (
      <InviteLayout>
        <div className="text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900">이메일이 달라요</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            이 초대는 <strong className="text-gray-800">{expectedEmail}</strong> 이메일 주소로 발급됐어요.<br />
            해당 이메일의 Google 계정으로 로그인해주세요.
          </p>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <GoogleIcon />
            {expectedEmail}로 로그인
          </button>
        </div>
      </InviteLayout>
    )
  }

  return (
    <InviteLayout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-gray-900">
            {inviterName}님이 초대했어요
          </h2>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-blue-600">{workspaceName}</span> 워크스페이스에 참여하세요
          </p>
        </div>

        <div className="bg-blue-50 rounded-2xl px-4 py-3 text-sm text-blue-700 text-center">
          초대받은 이메일: <strong>{invitedEmail}</strong>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          <GoogleIcon />
          Google 계정으로 참여하기
        </button>

        <p className="text-xs text-gray-400 text-center">
          초대받은 이메일({invitedEmail})의 Google 계정으로 로그인해주세요
        </p>
      </div>
    </InviteLayout>
  )
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <TalkBaseLogo variant="wordmark" size={26} />
      </div>
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
