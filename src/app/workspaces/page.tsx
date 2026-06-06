export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import WorkspaceList from '@/components/workspaces/WorkspaceList'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'
import InviteWaiting from '@/components/workspaces/InviteWaiting'

export default async function WorkspacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 기존 멤버십 여부 확인 (joined + pending 모두)
  const { count } = await db
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const hasAnyMembership = (count ?? 0) > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
      <header className="px-6 py-5 flex items-center">
        <TalkBaseLogo variant="wordmark" size={26} />
      </header>

      <main className="max-w-2xl mx-auto px-5 sm:px-6 py-8 sm:py-12">
        {hasAnyMembership ? (
          <WorkspaceList />
        ) : (
          <InviteWaiting email={user.email!} />
        )}
      </main>
    </div>
  )
}
