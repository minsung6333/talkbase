'use client'

import { useState, useEffect, useRef } from 'react'
import { UserPlus, Check, Crown, User, MoreHorizontal, Trash2, Mail, X } from 'lucide-react'
import type { TeamMember } from '@/types'

export default function AdminPanel({ members: initial }: { members: TeamMember[] }) {
  const [members, setMembers] = useState(initial)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warn'; text: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // 메뉴 바깥 클릭하면 닫기
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const refreshMembers = async () => {
    const res = await fetch('/api/admin/members')
    if (res.ok) {
      const data = await res.json()
      setMembers(data.members || [])
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setMessage(null)

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()

    if (res.ok) {
      if (data.emailSent) {
        setMessage({ type: 'success', text: `✓ ${email}에 초대 메일을 발송했어요` })
      } else {
        setMessage({ type: 'warn', text: `⚠️ 팀원 추가는 완료됐지만 메일 발송에 실패했어요` })
      }
      setEmail('')
      // 새 멤버 보이도록 목록 갱신
      const newMember: TeamMember = {
        id: 'temp-' + Date.now(),
        user_id: '',
        email: email.trim(),
        role: 'member',
        invited_at: new Date().toISOString(),
      }
      setMembers(prev => [newMember, ...prev])
      setTimeout(refreshMembers, 1000)
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error || '초대 실패'}` })
    }
    setInviting(false)
  }

  const handleDelete = async (member: TeamMember) => {
    const name = member.full_name || member.email
    if (!confirm(`${name}님을 팀에서 내보낼까요?\n\n이 사람이 올린 녹음 자체는 유지되지만, 더 이상 접근할 수 없게 돼요.`)) return

    setDeletingId(member.id)
    setMenuOpen(null)

    const res = await fetch(`/api/admin/members/${member.id}`, { method: 'DELETE' })
    const data = await res.json()

    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== member.id))
      setMessage({ type: 'success', text: `✓ ${name}님을 팀에서 내보냈어요` })
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error || '삭제 실패'}` })
    }
    setDeletingId(null)
  }

  const messageColor = message?.type === 'success'
    ? 'bg-green-50 text-green-700'
    : message?.type === 'warn'
    ? 'bg-yellow-50 text-yellow-700'
    : 'bg-red-50 text-red-600'

  return (
    <div className="space-y-6">
      {/* 팀원 초대 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">팀원 초대</h2>
        <p className="text-sm text-gray-500 mb-4">
          초대 메일이 자동으로 발송돼요
        </p>
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
            {inviting ? '발송 중...' : '초대'}
          </button>
        </form>
        {message && (
          <div className={`mt-3 ${messageColor} rounded-xl px-3 py-2 text-sm flex items-center justify-between`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-current opacity-50 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 팀원 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">팀원 목록 ({members.length}명)</h2>
        <div className="space-y-1">
          {members.map(m => {
            const isDeleting = deletingId === m.id
            const canDelete = m.role !== 'admin'
            return (
              <div key={m.id}
                className={`flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-gray-50 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {m.role === 'admin' && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {m.full_name || m.email}
                    </span>
                  </div>
                  {m.full_name && (
                    <p className="text-xs text-gray-400 truncate">{m.email}</p>
                  )}
                </div>

                {/* 상태 뱃지 */}
                <div className="flex-shrink-0 w-20 flex justify-end">
                  {m.joined_at ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 whitespace-nowrap">
                      <Check className="w-3.5 h-3.5" /> 가입됨
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 whitespace-nowrap">
                      <Mail className="w-3.5 h-3.5" /> 초대 대기
                    </span>
                  )}
                </div>

                {/* 더보기 메뉴 (어드민 아닌 사람만) */}
                <div className="flex-shrink-0 w-8 flex justify-end">
                  {canDelete && (
                    <div className="relative" ref={menuOpen === m.id ? menuRef : undefined}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpen === m.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-lg z-10 w-40 py-1">
                          <button
                            onClick={() => handleDelete(m)}
                            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 팀에서 내보내기
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
