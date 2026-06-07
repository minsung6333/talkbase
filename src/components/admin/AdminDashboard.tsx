'use client'

import { useEffect, useState } from 'react'
import {
  UserPlus, Mail, Check, X, Loader2, Clock, User, Building2,
  Users as UsersIcon, Crown, Shield, Trash2, ShieldCheck, Star, Ban,
} from 'lucide-react'

interface Signup {
  id: string
  user_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  reapplied_count: number
  created_at: string
}

interface InviteApproval {
  id: string
  workspace_id: string
  workspace_name: string
  email: string
  role: string
  requested_by: string | null
  requester: { name: string; email: string } | null
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
}

type Tab = 'signups' | 'invites' | 'users' | 'blocked'

interface BlockedEmail {
  id: string
  email: string
  reason: string | null
  blocked_at: string
}
type StatusFilter = 'pending' | 'approved' | 'rejected'
type UserTier = 'super_admin' | 'creator' | 'invited_only' | 'pending' | 'rejected' | 'unknown'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
  tier: UserTier
  signup: { status: string; reject_reason: string | null; reapplied_count: number; signup_created_at: string } | null
  memberships: Array<{ workspace_id: string; workspace_name: string; role: string }>
  is_owner_of_any: boolean
}

const TIER_INFO: Record<UserTier, { label: string; color: string; Icon: React.ElementType }> = {
  super_admin: { label: '슈퍼 관리자', color: 'bg-purple-100 text-purple-700', Icon: ShieldCheck },
  creator: { label: '개설자', color: 'bg-blue-100 text-blue-700', Icon: Star },
  invited_only: { label: '초대 멤버', color: 'bg-gray-100 text-gray-600', Icon: User },
  pending: { label: '심사 대기', color: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  rejected: { label: '거절됨', color: 'bg-red-100 text-red-700', Icon: X },
  unknown: { label: '미분류', color: 'bg-gray-100 text-gray-500', Icon: User },
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('signups')
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [signups, setSignups] = useState<Signup[]>([])
  const [approvals, setApprovals] = useState<InviteApproval[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [blockedEmails, setBlockedEmails] = useState<BlockedEmail[]>([])
  const [newBlockEmail, setNewBlockEmail] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      if (tab === 'signups') {
        const res = await fetch(`/api/admin/signups?status=${filter}`)
        const d = await res.json()
        setSignups(d.signups || [])
      } else if (tab === 'invites') {
        const res = await fetch(`/api/admin/invite-approvals?status=${filter}`)
        const d = await res.json()
        setApprovals(d.approvals || [])
      } else if (tab === 'users') {
        const res = await fetch('/api/admin/users')
        const d = await res.json()
        setUsers(d.users || [])
      } else if (tab === 'blocked') {
        const res = await fetch('/api/admin/blocked-emails')
        const d = await res.json()
        setBlockedEmails(d.blockedEmails || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab, filter])

  const handleSignupAction = async (id: string, action: 'approve' | 'reject') => {
    let reason: string | undefined
    if (action === 'reject') {
      const r = prompt('거절 사유를 입력해주세요 (신청자에게 메일로 발송돼요)')
      if (r === null) return
      reason = r.trim() || undefined
    } else if (!confirm('이 사용자의 가입을 승인할까요?')) {
      return
    }

    setProcessingId(id)
    const res = await fetch(`/api/admin/signups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejectReason: reason }),
    })
    setProcessingId(null)
    if (res.ok) {
      setSignups((prev) => prev.filter((s) => s.id !== id))
      setMsg({ type: 'success', text: action === 'approve' ? '✓ 승인했어요' : '✓ 거절했어요' })
    } else {
      const d = await res.json()
      setMsg({ type: 'error', text: `❌ ${d.error || '실패'}` })
    }
  }

  const handleInviteAction = async (id: string, action: 'approve' | 'reject') => {
    let reason: string | undefined
    if (action === 'reject') {
      const r = prompt('거절 사유를 입력해주세요 (선택)')
      if (r === null) return
      reason = r.trim() || undefined
    } else if (!confirm('이 초대를 승인하고 피초대자에게 메일을 발송할까요?')) {
      return
    }

    setProcessingId(id)
    const res = await fetch(`/api/admin/invite-approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejectReason: reason }),
    })
    setProcessingId(null)
    const d = await res.json()
    if (res.ok) {
      setApprovals((prev) => prev.filter((a) => a.id !== id))
      if (action === 'approve') {
        setMsg({
          type: 'success',
          text: d.emailSent
            ? '✓ 승인 + 초대 메일 발송 완료'
            : d.emailError
              ? `⚠️ 승인됐지만 메일 발송 실패: ${d.emailError}`
              : '⚠️ 승인은 됐지만 메일 발송 실패',
        })
      } else {
        setMsg({ type: 'success', text: '✓ 거절했어요' })
      }
    } else {
      setMsg({ type: 'error', text: `❌ ${d.error || '실패'}` })
    }
  }

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBlockEmail.trim()) return
    const res = await fetch('/api/admin/blocked-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newBlockEmail.trim(), reason: newBlockReason.trim() }),
    })
    const d = await res.json()
    if (res.ok) {
      setNewBlockEmail('')
      setNewBlockReason('')
      setMsg({ type: 'success', text: `✓ ${newBlockEmail}을 차단했어요` })
      load()
    } else {
      setMsg({ type: 'error', text: `❌ ${d.error || '실패'}` })
    }
  }

  const handleUnblock = async (b: BlockedEmail) => {
    if (!confirm(`${b.email} 차단을 해제할까요? 다시 로그인 가능해져요.`)) return
    const res = await fetch(`/api/admin/blocked-emails/${b.id}`, { method: 'DELETE' })
    if (res.ok) {
      setBlockedEmails((prev) => prev.filter((x) => x.id !== b.id))
      setMsg({ type: 'success', text: `✓ ${b.email} 차단 해제` })
    } else {
      const d = await res.json()
      setMsg({ type: 'error', text: `❌ ${d.error || '실패'}` })
    }
  }

  const handleDeleteUser = async (u: AdminUser) => {
    const name = u.full_name || u.email
    const ok = confirm(
      `⚠️ ${name} 계정을 완전히 삭제할까요?\n\n` +
      `이 작업은 되돌릴 수 없어요:\n` +
      `• Supabase 계정 (auth.users) 삭제\n` +
      `• 본인이 owner인 워크스페이스(다른 멤버 없는 경우만) 통째로 삭제\n` +
      `• 모든 멤버십, 가입 기록 삭제\n\n` +
      `계속하려면 확인을 누르세요.`
    )
    if (!ok) return

    setProcessingId(u.id)
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    const d = await res.json()
    setProcessingId(null)
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      setMsg({
        type: 'success',
        text: `✓ ${name} 삭제 완료 (워크스페이스 ${d.deletedWorkspaces || 0}개 함께 삭제, ${d.blockedEmail ? '이메일 영구 차단' : '차단 없음'})`,
      })
    } else if (res.status === 409 && d.blockingWorkspaces) {
      const list = d.blockingWorkspaces.map((w: { name: string; memberCount: number }) => `• ${w.name} (다른 멤버 ${w.memberCount}명)`).join('\n')
      setMsg({
        type: 'error',
        text: `❌ ${d.error}\n${list}`,
      })
    } else {
      setMsg({ type: 'error', text: `❌ ${d.error || '실패'}` })
    }
  }

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100">
        <TabButton active={tab === 'signups'} onClick={() => setTab('signups')}
          icon={UserPlus} label="가입 신청" />
        <TabButton active={tab === 'invites'} onClick={() => setTab('invites')}
          icon={Mail} label="초대 승인" />
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}
          icon={UsersIcon} label="전체 유저" />
        <TabButton active={tab === 'blocked'} onClick={() => setTab('blocked')}
          icon={Ban} label="차단" />
      </div>

      {/* 상태 필터 / 검색 / 차단 추가 */}
      {tab === 'signups' || tab === 'invites' ? (
        <div className="flex gap-1.5">
          {(['pending', 'approved', 'rejected'] as StatusFilter[]).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === s
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}>
              {s === 'pending' ? '⏳ 대기' : s === 'approved' ? '✅ 승인됨' : '🚫 거절됨'}
            </button>
          ))}
        </div>
      ) : tab === 'users' ? (
        <input
          type="text"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="이메일 또는 이름으로 검색"
          className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <form onSubmit={handleAddBlock} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">이메일 수동 차단</p>
          <div className="flex gap-2">
            <input type="email" value={newBlockEmail} onChange={(e) => setNewBlockEmail(e.target.value)}
              placeholder="차단할 이메일"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)}
              placeholder="사유 (선택)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1">
              <Ban className="w-3.5 h-3.5" /> 차단
            </button>
          </div>
        </form>
      )}

      {msg && (
        <div className={`rounded-xl px-3 py-2 text-sm flex items-center justify-between ${
          msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="opacity-50 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
        </div>
      ) : tab === 'signups' ? (
        <SignupList items={signups} filter={filter} processingId={processingId} onAction={handleSignupAction} />
      ) : tab === 'invites' ? (
        <InviteList items={approvals} filter={filter} processingId={processingId} onAction={handleInviteAction} />
      ) : tab === 'users' ? (
        <UserList items={users} search={userSearch} processingId={processingId} onDelete={handleDeleteUser} />
      ) : (
        <BlockedList items={blockedEmails} onUnblock={handleUnblock} />
      )}
    </div>
  )
}

function BlockedList({ items, onUnblock }: {
  items: BlockedEmail[]
  onUnblock: (b: BlockedEmail) => void
}) {
  if (!items.length) return <EmptyState label="차단된 이메일이 없어요" />

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">총 {items.length}개</p>
      {items.map((b) => (
        <div key={b.id} className="bg-white rounded-2xl border border-red-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <Ban className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{b.email}</p>
            {b.reason && <p className="text-xs text-gray-500 truncate">{b.reason}</p>}
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 차단 {new Date(b.blocked_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <button onClick={() => onUnblock(b)}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
            <X className="w-3.5 h-3.5" /> 해제
          </button>
        </div>
      ))}
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}

function SignupList({ items, filter, processingId, onAction }: {
  items: Signup[]
  filter: StatusFilter
  processingId: string | null
  onAction: (id: string, action: 'approve' | 'reject') => void
}) {
  if (!items.length) return <EmptyState label={`${filter === 'pending' ? '대기 중인' : filter === 'approved' ? '승인된' : '거절된'} 신청이 없어요`} />

  return (
    <div className="space-y-2">
      {items.map((s) => {
        const processing = processingId === s.id
        return (
          <div key={s.id}
            className={`bg-white rounded-2xl border border-gray-100 p-4 ${processing ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              {s.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatar_url} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">{s.full_name || s.email}</p>
                  {s.reapplied_count > 0 && (
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      재신청 {s.reapplied_count}회
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{s.email}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(s.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              {filter === 'pending' && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => onAction(s.id, 'approve')} disabled={processing}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    <Check className="w-3.5 h-3.5" /> 승인
                  </button>
                  <button onClick={() => onAction(s.id, 'reject')} disabled={processing}
                    className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
                    <X className="w-3.5 h-3.5" /> 거절
                  </button>
                </div>
              )}
            </div>
            {filter === 'rejected' && s.reject_reason && (
              <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700">
                <strong>거절 사유:</strong> {s.reject_reason}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InviteList({ items, filter, processingId, onAction }: {
  items: InviteApproval[]
  filter: StatusFilter
  processingId: string | null
  onAction: (id: string, action: 'approve' | 'reject') => void
}) {
  if (!items.length) return <EmptyState label={`${filter === 'pending' ? '대기 중인' : filter === 'approved' ? '승인된' : '거절된'} 초대 요청이 없어요`} />

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const processing = processingId === a.id
        return (
          <div key={a.id}
            className={`bg-white rounded-2xl border border-gray-100 p-4 ${processing ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{a.workspace_name}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.role}</span>
                </div>
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">초대자</span> <strong>{a.requester?.name || '(unknown)'}</strong>
                  <span className="text-gray-400 mx-1.5">→</span>
                  <span className="text-gray-500">피초대자</span> <strong>{a.email}</strong>
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(a.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              {filter === 'pending' && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => onAction(a.id, 'approve')} disabled={processing}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    <Check className="w-3.5 h-3.5" /> 승인
                  </button>
                  <button onClick={() => onAction(a.id, 'reject')} disabled={processing}
                    className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
                    <X className="w-3.5 h-3.5" /> 거절
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UserList({ items, search, processingId, onDelete }: {
  items: AdminUser[]
  search: string
  processingId: string | null
  onDelete: (u: AdminUser) => void
}) {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? items.filter((u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
      )
    : items

  if (!filtered.length) return <EmptyState label={items.length ? '검색 결과가 없어요' : '유저가 없어요'} />

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">총 {filtered.length}명 {q && `(검색 결과)`}</p>
      {filtered.map((u) => {
        const processing = processingId === u.id
        const tierInfo = TIER_INFO[u.tier]
        const TierIcon = tierInfo.Icon
        return (
          <div key={u.id}
            className={`bg-white rounded-2xl border border-gray-100 p-4 ${processing ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-3">
              {u.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900 truncate">{u.full_name || u.email}</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${tierInfo.color}`}>
                    <TierIcon className="w-3 h-3" /> {tierInfo.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                {u.memberships.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {u.memberships.map((m) => {
                      const RoleIcon = m.role === 'owner' ? Crown : m.role === 'admin' ? Shield : User
                      const roleColor = m.role === 'owner' ? 'text-yellow-500' : m.role === 'admin' ? 'text-blue-500' : 'text-gray-400'
                      return (
                        <span key={m.workspace_id}
                          className="inline-flex items-center gap-1 text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
                          <RoleIcon className={`w-2.5 h-2.5 ${roleColor}`} />
                          {m.workspace_name}
                        </span>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 가입 {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </span>
                  {u.last_sign_in_at && (
                    <span>· 최근 로그인 {new Date(u.last_sign_in_at).toLocaleDateString('ko-KR')}</span>
                  )}
                </p>
              </div>
              {u.tier !== 'super_admin' && (
                <button onClick={() => onDelete(u)} disabled={processing}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
