import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { resolveCurrentWorkspace } from '@/lib/workspace'
import { isSuperAdmin } from '@/lib/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ isAdmin: false, isSuperAdmin: false })

  const superAdmin = isSuperAdmin(user.email)
  const { workspaceId } = await resolveCurrentWorkspace()

  if (!workspaceId) {
    return NextResponse.json({ isAdmin: false, role: null, isSuperAdmin: superAdmin })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: member } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  const role = member?.role || null
  return NextResponse.json({
    isAdmin: role === 'owner' || role === 'admin',
    role,
    isSuperAdmin: superAdmin,
  })
}
