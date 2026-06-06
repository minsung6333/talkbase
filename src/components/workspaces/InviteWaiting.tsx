'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function InviteWaiting({ email }: { email: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-6xl">📬</div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">초대를 기다리는 중이에요</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          TalkBase는 초대받은 분만 사용할 수 있어요.<br />
          팀 관리자에게 초대 메일을 요청해보세요.
        </p>
      </div>

      <div className="bg-blue-50 rounded-2xl px-5 py-4 text-sm text-blue-700">
        로그인된 계정: <strong>{email}</strong>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left space-y-3 text-sm">
        <p className="font-medium text-gray-800">초대 이메일을 받으셨나요?</p>
        <ul className="space-y-1.5 text-gray-500">
          <li>• 메일함에서 TalkBase 초대 메일을 찾아주세요</li>
          <li>• <strong className="text-gray-700">{email}</strong> 계정으로 로그인되어 있어야 해요</li>
          <li>• 초대 링크 클릭 시 자동으로 워크스페이스에 참여돼요</li>
        </ul>
      </div>

      <button
        onClick={handleLogout}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline"
      >
        다른 계정으로 로그인하기
      </button>
    </div>
  )
}
