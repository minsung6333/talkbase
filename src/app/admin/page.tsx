import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Header from '@/components/layout/Header'
import AdminPanel from '@/components/admin/AdminPanel'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 어드민인지 확인
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: member } = await admin
    .from('team_members')
    .select('role')
    .eq('user_id', user?.id || '')
    .single()

  if (member?.role !== 'admin') redirect('/')

  const { data: members } = await admin
    .from('team_members')
    .select('*')
    .order('invited_at', { ascending: false })

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">팀 관리</h1>
        <AdminPanel members={members || []} />
      </main>
    </>
  )
}
