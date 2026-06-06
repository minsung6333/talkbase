'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  email: string
  status: 'pending' | 'approved' | 'rejected'
  rejectReason?: string
}

export default function SignupStatus({ email, status, rejectReason }: Props) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (status === 'rejected') {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-6xl">😢</div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">신청이 승인되지 않았어요</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            관리자가 이번 가입 신청을 승인하지 않았어요.
          </p>
        </div>

        {rejectReason && (
          <div className="bg-gray-50 rounded-2xl px-5 py-4 text-left">
            <p className="text-xs text-gray-500 mb-1">사유</p>
            <p className="text-sm text-gray-800">{rejectReason}</p>
          </div>
        )}

        <div className="bg-blue-50 rounded-2xl px-5 py-4 text-sm text-blue-700">
          로그인된 계정: <strong>{email}</strong>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-2">재신청 방법</p>
          <ul className="space-y-1.5 text-gray-500">
            <li>• 로그아웃 후 다시 같은 계정으로 로그인하면 자동으로 재신청돼요</li>
            <li>• 다른 계정으로 시도하려면 로그아웃 후 진행해주세요</li>
          </ul>
        </div>

        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline"
        >
          로그아웃
        </button>
      </div>
    )
  }

  // pending
  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-6xl">⏳</div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">가입 신청을 검토 중이에요</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          관리자가 확인 후 승인 결과를 메일로 안내해드릴게요.<br />
          보통 1~2일 안에 답변드려요.
        </p>
      </div>

      <div className="bg-blue-50 rounded-2xl px-5 py-4 text-sm text-blue-700">
        신청한 계정: <strong>{email}</strong>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left text-sm">
        <p className="font-medium text-gray-800 mb-2">초대받은 워크스페이스가 있나요?</p>
        <ul className="space-y-1.5 text-gray-500">
          <li>• 초대 메일의 링크를 클릭하시면 바로 합류할 수 있어요</li>
          <li>• <strong className="text-gray-700">{email}</strong> 계정으로 로그인되어 있어야 해요</li>
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
