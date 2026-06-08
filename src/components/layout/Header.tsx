'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Mic, Home, FolderOpen, Search, Settings, LogOut, User,
  Crown, Shield, ShieldCheck, Users, ChevronDown, Plus,
  type LucideIcon,
} from 'lucide-react'
import type { WorkspaceRole } from '@/lib/workspace'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface WorkspaceItem {
  id: string
  name: string
  slug: string
  role: WorkspaceRole
}

const ROLE_ICON: Record<WorkspaceItem['role'], LucideIcon> = {
  owner: Crown,
  admin: Shield,
  member: Users,
}

const ROLE_LABEL: Record<WorkspaceItem['role'], string> = {
  owner: '소유자',
  admin: '관리자',
  member: '멤버',
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [myWorkspaceRole, setMyWorkspaceRole] = useState<WorkspaceRole | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('tb_isSuperAdmin') === '1'
  })

  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return sessionStorage.getItem('tb_workspace_name') || ''
  })

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)


  useEffect(() => {
    fetch('/api/workspaces')
      .then(r => r.json())
      .then(d => {
        const list: WorkspaceItem[] = d.workspaces || []
        const cid: string | null = d.currentId || null
        setWorkspaces(list)
        setCurrentWorkspaceId(cid)

        const current = list.find(w => w.id === cid)
        const name = current?.name || list[0]?.name || ''
        setCurrentWorkspaceName(name)
        if (name) sessionStorage.setItem('tb_workspace_name', name)
        setMyWorkspaceRole(current?.role || list[0]?.role || null)
      })
      .catch(() => {})

    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        const sa = !!d.isSuperAdmin
        setIsSuperAdmin(sa)
        sessionStorage.setItem('tb_isSuperAdmin', sa ? '1' : '0')
      })
      .catch(() => {})
  }, [])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSwitch = async (ws: WorkspaceItem) => {
    if (ws.id === currentWorkspaceId || switching) return
    setSwitching(true)
    try {
      const res = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: ws.id }),
      })
      if (res.ok) {
        sessionStorage.setItem('tb_workspace_name', ws.name)
        window.location.href = '/'
      }
    } finally {
      setSwitching(false)
      setDropdownOpen(false)
    }
  }

  const settingsHref = currentWorkspaceId ? `/workspaces/${currentWorkspaceId}/settings` : null

  const navItems: NavItem[] = [
    { href: '/',        label: '홈',    icon: Home },
    { href: '/upload',  label: '업로드', icon: Mic },
    { href: '/history', label: '보관함', icon: FolderOpen },
    { href: '/search',  label: '검색',   icon: Search },
    // 모든 멤버가 접근 가능: 멤버는 정보 열람·본인 탈퇴, owner/admin은 관리 가능
    ...(myWorkspaceRole && settingsHref ? [{ href: settingsHref, label: '관리', icon: Settings }] : []),
    ...(isSuperAdmin ? [{ href: '/admin', label: '슈퍼', icon: ShieldCheck }] : []),
  ]

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">

          {/* 로고 + 워크스페이스 전환기 */}
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center font-bold text-gray-900 flex-shrink-0">
              <span className="block sm:hidden"><TalkBaseLogo variant="icon" size={44} /></span>
              <span className="hidden sm:block"><TalkBaseLogo variant="icon" size={56} /></span>
              <span className="tracking-tight text-base sm:text-lg -ml-1">TalkBase</span>
            </Link>

            {/* 워크스페이스 드롭다운 */}
            {workspaces.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-1 max-w-[120px] sm:max-w-[180px] px-2 py-1 rounded-lg
                             text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-100
                             transition-colors border border-gray-200"
                  title={currentWorkspaceName}
                >
                  <span className="truncate">{currentWorkspaceName || '워크스페이스'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200
                                  rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {workspaces.map(ws => {
                      const RoleIcon = ROLE_ICON[ws.role]
                      const isCurrent = ws.id === currentWorkspaceId
                      return (
                        <button
                          key={ws.id}
                          onClick={() => handleSwitch(ws)}
                          disabled={isCurrent || switching}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left
                                      transition-colors disabled:cursor-default
                                      ${isCurrent
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                        >
                          <RoleIcon className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-blue-500' : 'text-gray-400'}`} />
                          <span className="flex-1 truncate font-medium">{ws.name}</span>
                          <span className={`text-[10px] flex-shrink-0 ${isCurrent ? 'text-blue-400' : 'text-gray-400'}`}>
                            {ROLE_LABEL[ws.role]}
                          </span>
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <Link
                        href="/workspaces"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500
                                   hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>새 워크스페이스 만들기</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 데스크탑 네비게이션 */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              )
            })}
            <Link href="/profile"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ml-1 ${
                pathname.startsWith('/profile') ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}>
              <User className="w-4 h-4" />
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>

          {/* 모바일: 슈퍼관리자 + 프로필 + 로그아웃 */}
          <div className="md:hidden flex items-center gap-1">
            {isSuperAdmin && (
              <Link href="/admin"
                className={`p-2 transition-colors ${
                  pathname.startsWith('/admin') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="슈퍼 관리자">
                <ShieldCheck className="w-5 h-5" />
              </Link>
            )}
            <Link href="/profile"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <User className="w-5 h-5" />
            </Link>
            <button onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 하단 탭바 */}
      <MobileTabBar navItems={navItems} pathname={pathname} />
    </>
  )
}

function MobileTabBar({ navItems, pathname }: { navItems: NavItem[]; pathname: string }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-400 active:bg-gray-50'
              }`}>
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
