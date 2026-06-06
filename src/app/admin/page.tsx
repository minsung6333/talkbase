import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isSuperAdmin(user.email)) redirect('/')

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">슈퍼 관리자</h1>
          <p className="text-sm text-gray-400 mt-1">가입 신청과 초대 요청을 검토하고 승인하세요</p>
        </div>
        <AdminDashboard />
      </main>
    </>
  )
}
