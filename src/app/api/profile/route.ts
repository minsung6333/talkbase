import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { resolveCurrentWorkspace } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await resolveCurrentWorkspace()
  if (!workspaceId) return NextResponse.json({})

  const { data: member } = await admin()
    .from('workspace_members')
    .select('email, full_name, avatar_url, role, notification_email')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(member || {})
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notificationEmail } = await request.json()

  const value = notificationEmail?.trim() || null

  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return NextResponse.json({ error: '이메일 형식이 올바르지 않아요' }, { status: 400 })
  }

  // 모든 워크스페이스에 걸쳐 일괄 업데이트 (알림 이메일은 사용자 단위)
  const { error } = await admin()
    .from('workspace_members')
    .update({ notification_email: value })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, notificationEmail: value })
}
