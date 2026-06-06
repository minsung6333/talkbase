import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getWorkspaceRole } from '@/lib/workspace'
import Header from '@/components/layout/Header'
import WorkspaceSettings from '@/components/workspaces/WorkspaceSettings'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = await getWorkspaceRole(id, user.id)
  if (!role) redirect('/')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: workspace }, { data: members }] = await Promise.all([
    db.from('workspaces').select('id, name, slug, created_at').eq('id', id).single(),
    db.from('workspace_members').select('*').eq('workspace_id', id).order('invited_at', { ascending: true }),
  ])

  if (!workspace) redirect('/')

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">워크스페이스 설정</h1>
          <p className="text-sm text-gray-400 mt-1">{workspace.name}</p>
        </div>
        <WorkspaceSettings
          workspace={workspace}
          members={members || []}
          myRole={role}
          myUserId={user.id}
        />
      </main>
    </>
  )
}
