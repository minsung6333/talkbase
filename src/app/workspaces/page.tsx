export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import WorkspaceList from '@/components/workspaces/WorkspaceList'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'
import SignupStatus from '@/components/workspaces/SignupStatus'

export default async function WorkspacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. 워크스페이스 멤버십 (joined만)
  const { count: memberCount } = await db
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('joined_at', 'is', null)

  const hasMembership = (memberCount ?? 0) > 0

  // 2. 가입 신청 상태
  const { data: signup } = await db
    .from('user_signups')
    .select('status, reject_reason')
    .eq('user_id', user.id)
    .maybeSingle()

  const signupStatus = signup?.status as 'pending' | 'approved' | 'rejected' | undefined
  const isApproved = signupStatus === 'approved' || hasMembership

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
      <header className="px-6 py-5 flex items-center">
        <TalkBaseLogo variant="wordmark" size={26} />
      </header>

      <main className="max-w-2xl mx-auto px-5 sm:px-6 py-8 sm:py-12">
        {isApproved ? (
          <WorkspaceList />
        ) : (
          <SignupStatus
            email={user.email!}
            status={signupStatus || 'pending'}
            rejectReason={signup?.reject_reason || undefined}
          />
        )}
      </main>
    </div>
  )
}
