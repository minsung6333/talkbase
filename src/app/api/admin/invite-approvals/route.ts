import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { isSuperAdmin } from '@/lib/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// GET: 초대 승인 대기 목록
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: approvals } = await db
    .from('invite_approvals')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  // 워크스페이스명 + 요청자 정보 조인
  const workspaceIds = [...new Set(approvals?.map((a) => a.workspace_id) || [])]
  const requesterIds = [...new Set(approvals?.map((a) => a.requested_by).filter(Boolean) || [])]

  const [{ data: workspaces }, { data: requesters }] = await Promise.all([
    workspaceIds.length
      ? db.from('workspaces').select('id, name').in('id', workspaceIds)
      : Promise.resolve({ data: [] }),
    requesterIds.length
      ? db.from('workspace_members')
          .select('user_id, full_name, email')
          .in('user_id', requesterIds)
      : Promise.resolve({ data: [] }),
  ])

  const wsMap = new Map((workspaces || []).map((w) => [w.id, w.name]))
  const userMap = new Map(
    (requesters || []).map((m) => [
      m.user_id,
      { name: m.full_name || m.email, email: m.email },
    ])
  )

  const enriched = (approvals || []).map((a) => ({
    ...a,
    workspace_name: wsMap.get(a.workspace_id) || '(삭제됨)',
    requester: a.requested_by ? userMap.get(a.requested_by) || null : null,
  }))

  return NextResponse.json({ approvals: enriched })
}
