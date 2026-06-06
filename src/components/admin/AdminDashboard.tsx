'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Mail, Check, X, Loader2, Clock, User, Building2 } from 'lucide-react'

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

type Tab = 'signups' | 'invites'
type StatusFilter = 'pending' | 'approved' | 'rejected'

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('signups')
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [signups, setSignups] = useState<Signup[]>([])
  const [approvals, setApprovals] = useState<InviteApproval[]>([])
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
      } else {
        const res = await fetch(`/api/admin/invite-approvals?status=${filter}`)
        const d = await res.json()
        setApprovals(d.approvals || [])
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
          text: d.emailSent ? '✓ 승인 + 초대 메일 발송 완료' : '⚠️ 승인은 됐지만 메일 발송 실패',
        })
      } else {
        setMsg({ type: 'success', text: '✓ 거절했어요' })
      }
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
      </div>

      {/* 상태 필터 */}
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
      ) : (
        <InviteList items={approvals} filter={filter} processingId={processingId} onAction={handleInviteAction} />
      )}
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
