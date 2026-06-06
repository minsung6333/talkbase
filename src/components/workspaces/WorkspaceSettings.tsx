'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus, Check, Crown, Shield, Users, User,
  MoreHorizontal, Trash2, Mail, X, Pencil, LogOut, AlertTriangle,
} from 'lucide-react'
import type { WorkspaceRole, WorkspaceMember } from '@/lib/workspace'

interface Workspace {
  id: string
  name: string
  slug: string
  created_at: string
}

const ROLE_ICON: Record<WorkspaceRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: Users,
}

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: '소유자',
  admin: '관리자',
  member: '멤버',
}

const ROLE_COLOR: Record<WorkspaceRole, string> = {
  owner: 'text-yellow-500',
  admin: 'text-blue-500',
  member: 'text-gray-400',
}

interface Props {
  workspace: Workspace
  members: WorkspaceMember[]
  myRole: WorkspaceRole
  myUserId: string
}

type MsgType = 'success' | 'error' | 'warn'

function Message({ type, text, onClose }: { type: MsgType; text: string; onClose: () => void }) {
  const color = type === 'success' ? 'bg-green-50 text-green-700'
    : type === 'warn' ? 'bg-yellow-50 text-yellow-700'
    : 'bg-red-50 text-red-600'
  return (
    <div className={`rounded-xl px-3 py-2 text-sm flex items-center justify-between ${color}`}>
      <span>{text}</span>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 ml-2">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function WorkspaceSettings({ workspace, members: initial, myRole, myUserId }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initial)
  const [msg, setMsg] = useState<{ type: MsgType; text: string } | null>(null)

  // 이름 편집
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(workspace.name)
  const [savingName, setSavingName] = useState(false)

  // 초대
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  // 멤버 메뉴
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // 역할 변경 모달
  const [roleTarget, setRoleTarget] = useState<WorkspaceMember | null>(null)

  // 워크스페이스 삭제 확인
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canManageMembers = myRole === 'owner' || myRole === 'admin'
  const isOwner = myRole === 'owner'

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const setSuccess = (text: string) => setMsg({ type: 'success', text })
  const setError = (text: string) => setMsg({ type: 'error', text })
  const setWarn = (text: string) => setMsg({ type: 'warn', text })

  const refreshMembers = async () => {
    const res = await fetch(`/api/workspaces/${workspace.id}/members`)
    if (res.ok) {
      const d = await res.json()
      setMembers(d.members || [])
    }
  }

  // 이름 저장
  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput === workspace.name) { setEditingName(false); return }
    setSavingName(true)
    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    })
    const d = await res.json()
    setSavingName(false)
    if (res.ok) {
      setSuccess('✓ 이름이 변경됐어요')
      setEditingName(false)
      // sessionStorage 동기화
      sessionStorage.setItem('tb_workspace_name', d.name)
      router.refresh()
    } else {
      setError(`❌ ${d.error || '변경 실패'}`)
    }
  }

  // 초대
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setMsg(null)
    const res = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    })
    const d = await res.json()
    setInviting(false)
    if (res.ok) {
      if (d.pendingApproval) {
        setSuccess(`✓ ${inviteEmail} 초대를 관리자 승인 대기열에 올렸어요`)
      } else if (d.emailSent) {
        setSuccess(`✓ ${inviteEmail}에 초대 메일을 발송했어요`)
      } else {
        setWarn('⚠️ 멤버 추가는 완료됐지만 메일 발송에 실패했어요')
      }
      setInviteEmail('')
      setTimeout(refreshMembers, 500)
    } else {
      setError(`❌ ${d.error || '초대 실패'}`)
    }
  }

  // 내보내기 / 탈퇴
  const handleRemove = async (m: WorkspaceMember) => {
    const isSelf = m.user_id === myUserId
    const name = m.full_name || m.email
    const confirmMsg = isSelf
      ? `이 워크스페이스에서 탈퇴할까요?`
      : `${name}님을 워크스페이스에서 내보낼까요?`
    if (!confirm(confirmMsg)) return

    setMenuOpen(null)
    const res = await fetch(`/api/workspaces/${workspace.id}/members/${m.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (res.ok) {
      if (isSelf) {
        // 탈퇴 후 워크스페이스 목록으로
        sessionStorage.removeItem('tb_workspace_name')
        window.location.href = '/workspaces'
      } else {
        setMembers(prev => prev.filter(x => x.id !== m.id))
        setSuccess(`✓ ${name}님을 내보냈어요`)
      }
    } else {
      setError(`❌ ${d.error || '실패'}`)
    }
  }

  // 역할 변경
  const handleRoleChange = async (m: WorkspaceMember, newRole: WorkspaceRole) => {
    const res = await fetch(`/api/workspaces/${workspace.id}/members/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    const d = await res.json()
    if (res.ok) {
      setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role: newRole } : x))
      setSuccess(`✓ ${m.full_name || m.email}님의 역할을 ${ROLE_LABEL[newRole]}로 변경했어요`)
    } else {
      setError(`❌ ${d.error || '변경 실패'}`)
    }
    setRoleTarget(null)
    setMenuOpen(null)
  }

  // 워크스페이스 삭제
  const handleDeleteWorkspace = async () => {
    setDeleting(true)
    const res = await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' })
    const d = await res.json()
    setDeleting(false)
    if (res.ok) {
      sessionStorage.removeItem('tb_workspace_name')
      window.location.href = '/workspaces'
    } else {
      setError(`❌ ${d.error || '삭제 실패'}`)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <Message type={msg.type} text={msg.text} onClose={() => setMsg(null)} />
      )}

      {/* 워크스페이스 정보 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">워크스페이스 정보</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16 flex-shrink-0">이름</span>
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleSaveName} disabled={savingName}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {savingName ? '저장 중...' : '저장'}
                </button>
                <button onClick={() => { setEditingName(false); setNameInput(workspace.name) }}
                  className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm">
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{nameInput}</span>
                {canManageMembers && (
                  <button onClick={() => setEditingName(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16 flex-shrink-0">슬러그</span>
            <span className="text-sm text-gray-400 font-mono">{workspace.slug}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16 flex-shrink-0">내 역할</span>
            <span className={`text-sm font-medium ${ROLE_COLOR[myRole]}`}>{ROLE_LABEL[myRole]}</span>
          </div>
        </div>
      </div>

      {/* 멤버 초대 */}
      {canManageMembers && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">멤버 초대</h2>
          <p className="text-sm text-gray-500 mb-4">초대 메일이 자동으로 발송돼요</p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="이메일 입력"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button type="submit" disabled={inviting}
              className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <UserPlus className="w-4 h-4" />
              {inviting ? '발송 중...' : '초대'}
            </button>
          </form>
        </div>
      )}

      {/* 멤버 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">멤버 ({members.length}명)</h2>
        <div className="space-y-1">
          {members.map(m => {
            const RoleIcon = ROLE_ICON[m.role as WorkspaceRole]
            const isSelf = m.user_id === myUserId
            const canRemove = isSelf || (canManageMembers && (myRole === 'owner' || m.role !== 'owner'))
            const canChangeRole = isOwner && !isSelf

            return (
              <div key={m.id}
                className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-gray-50 transition-colors">
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
                    <RoleIcon className={`w-3.5 h-3.5 flex-shrink-0 ${ROLE_COLOR[m.role as WorkspaceRole]}`} />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {m.full_name || m.email}
                      {isSelf && <span className="text-gray-400 font-normal"> (나)</span>}
                    </span>
                  </div>
                  {m.full_name && (
                    <p className="text-xs text-gray-400 truncate">{m.email}</p>
                  )}
                </div>

                {/* 역할 뱃지 */}
                <span className={`text-xs flex-shrink-0 ${ROLE_COLOR[m.role as WorkspaceRole]}`}>
                  {ROLE_LABEL[m.role as WorkspaceRole]}
                </span>

                {/* 가입 상태 */}
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

                {/* 더보기 메뉴 */}
                {(canRemove || canChangeRole) && (
                  <div className="flex-shrink-0 relative" ref={menuOpen === m.id ? menuRef : undefined}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === m.id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-lg z-10 w-44 py-1">
                        {canChangeRole && (
                          <>
                            {(['owner', 'admin', 'member'] as WorkspaceRole[]).map(r => (
                              r !== m.role && (
                                <button key={r} onClick={() => handleRoleChange(m, r)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                  {(() => { const I = ROLE_ICON[r]; return <I className="w-3.5 h-3.5 text-gray-400" /> })()}
                                  {ROLE_LABEL[r]}으로 변경
                                </button>
                              )
                            ))}
                            <div className="border-t border-gray-100 my-1" />
                          </>
                        )}
                        {canRemove && (
                          <button onClick={() => handleRemove(m)}
                            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-500 hover:bg-red-50">
                            {isSelf
                              ? <><LogOut className="w-3.5 h-3.5" /> 탈퇴하기</>
                              : <><Trash2 className="w-3.5 h-3.5" /> 내보내기</>
                            }
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 위험 구역 */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-semibold text-red-600 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> 위험 구역
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            워크스페이스를 삭제하면 모든 녹음·폴더·멤버 데이터가 영구 삭제돼요.
          </p>
          {deleteConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 font-medium">정말 삭제할까요?</span>
              <button onClick={handleDeleteWorkspace} disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? '삭제 중...' : '네, 삭제'}
              </button>
              <button onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                취소
              </button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
              워크스페이스 삭제
            </button>
          )}
        </div>
      )}
    </div>
  )
}
