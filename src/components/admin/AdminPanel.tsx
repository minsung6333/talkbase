'use client'

import { useState } from 'react'
import { UserPlus, Check, X, Crown, User } from 'lucide-react'
import type { TeamMember } from '@/types'

export default function AdminPanel({ members }: { members: TeamMember[] }) {
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setMessage('')

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()

    if (res.ok) {
      setMessage(`✅ ${email} 초대 완료`)
      setEmail('')
    } else {
      setMessage(`❌ ${data.error || '초대 실패'}`)
    }
    setInviting(false)
  }

  return (
    <div className="space-y-6">
      {/* 팀원 초대 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">팀원 초대</h2>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="팀원 이메일 입력"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            초대
          </button>
        </form>
        {message && (
          <p className="text-sm mt-2 text-gray-600">{message}</p>
        )}
      </div>

      {/* 팀원 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">팀원 목록 ({members.length}명)</h2>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {m.role === 'admin' && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                  <span className="text-sm font-medium text-gray-900">
                    {m.full_name || m.email}
                  </span>
                </div>
                {m.full_name && (
                  <p className="text-xs text-gray-400">{m.email}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {m.joined_at ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3.5 h-3.5" /> 가입됨
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">초대 대기</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
