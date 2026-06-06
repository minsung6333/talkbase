'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Crown, Shield, User, ArrowRight, Loader2, Check } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  created_at: string
  role: 'owner' | 'admin' | 'member'
}

export default function WorkspaceList() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/workspaces')
      .then(r => r.json())
      .then(d => {
        setWorkspaces(d.workspaces || [])
        setCurrentId(d.currentId)
        if (!d.workspaces?.length) setShowCreate(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSwitch = async (id: string) => {
    setSwitching(id)
    setError('')
    const res = await fetch('/api/workspaces/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: id }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || '전환 실패')
      setSwitching(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(data.error || '생성 실패')
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    )
  }

  const hasWorkspaces = workspaces.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {hasWorkspaces ? '워크스페이스 선택' : '시작할 준비가 됐어요'}
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          {hasWorkspaces
            ? '들어갈 워크스페이스를 선택하거나 새로 만들 수 있어요'
            : '첫 워크스페이스를 만들거나 초대를 기다려주세요'}
        </p>
      </div>

      {/* 워크스페이스 목록 */}
      {hasWorkspaces && (
        <div className="space-y-2">
          {workspaces.map(ws => {
            const isActive = ws.id === currentId
            const isLoading = switching === ws.id
            return (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                disabled={isLoading || !!switching}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                } ${switching && !isLoading ? 'opacity-40' : ''}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-900">{ws.name}</span>
                    {isActive && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        현재
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    {ws.role === 'owner' && <><Crown className="w-3 h-3 text-yellow-500" /> Owner</>}
                    {ws.role === 'admin' && <><Shield className="w-3 h-3 text-blue-500" /> Admin</>}
                    {ws.role === 'member' && <><User className="w-3 h-3 text-gray-400" /> Member</>}
                  </div>
                </div>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : isActive ? (
                  <Check className="w-4 h-4 text-blue-500" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* 새 워크스페이스 만들기 */}
      {showCreate ? (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-blue-200 p-5 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              워크스페이스 이름
            </label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="예: clabi, 친구들 모임, ACME Corp"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-400 mt-1.5">
              조직, 팀, 또는 친구들 모임 등 무엇이든 좋아요.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중...</>
                : <><Plus className="w-4 h-4" /> 만들기</>
              }
            </button>
            {hasWorkspaces && (
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(''); setError('') }}
                className="border border-gray-200 text-gray-600 rounded-xl px-4 text-sm hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            )}
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-2xl py-4 text-sm font-medium hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 워크스페이스 만들기
        </button>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">❌ {error}</p>
      )}

      {/* 안내 */}
      <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 space-y-1.5">
        <p className="font-medium text-gray-600">💡 워크스페이스란?</p>
        <p>한 사람이 여러 조직(또는 모임)에 속할 수 있어요. 각 워크스페이스는 별도의 폴더·녹음·멤버를 가져요.</p>
        <p>다른 사람이 보낸 초대 메일의 링크를 클릭하면 자동으로 그 워크스페이스에 추가돼요.</p>
      </div>
    </div>
  )
}
