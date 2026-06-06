'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mic, Home, FolderOpen, Search, Settings, LogOut, User, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => {})
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems: NavItem[] = [
    { href: '/',         label: '홈',    icon: Home },
    { href: '/upload',   label: '업로드', icon: Mic },
    { href: '/history',  label: '보관함', icon: FolderOpen },
    { href: '/search',   label: '검색',   icon: Search },
    ...(isAdmin ? [{ href: '/admin', label: '관리', icon: Settings }] : []),
  ]

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center font-bold text-gray-900 flex-shrink-0">
            <TalkBaseLogo variant="icon" size={56} />
            <span className="tracking-tight text-lg -ml-1">TalkBase</span>
          </Link>

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

          {/* 모바일: 프로필 + 로그아웃 */}
          <div className="md:hidden flex items-center gap-1">
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
