import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { isSuperAdmin } from '@/lib/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// GET: 전체 유저 목록 (auth.users + 멤버십 + signup 상태)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // auth.users 전체 조회 (admin API)
  const { data: authData, error: authErr } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 })
  }

  const authUsers = authData?.users || []
  const userIds = authUsers.map((u) => u.id)

  // 모든 사용자의 멤버십 + 가입 신청 상태 조회
  const [{ data: memberships }, { data: signups }] = await Promise.all([
    userIds.length
      ? db.from('workspace_members')
          .select('user_id, role, workspace_id, workspaces(id, name)')
          .in('user_id', userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? db.from('user_signups')
          .select('user_id, status, reject_reason, reapplied_count, created_at')
          .in('user_id', userIds)
      : Promise.resolve({ data: [] }),
  ])

  // user_id → memberships, signup 매핑
  const membersByUser = new Map<string, Array<{
    workspace_id: string
    workspace_name: string
    role: string
  }>>()
  for (const m of memberships || []) {
    if (!m.user_id) continue
    const list = membersByUser.get(m.user_id) || []
    const ws = m.workspaces as unknown as { id: string; name: string } | null
    list.push({
      workspace_id: m.workspace_id,
      workspace_name: ws?.name || '(삭제됨)',
      role: m.role,
    })
    membersByUser.set(m.user_id, list)
  }

  const signupByUser = new Map(
    (signups || []).map((s) => [
      s.user_id,
      {
        status: s.status,
        reject_reason: s.reject_reason,
        reapplied_count: s.reapplied_count,
        signup_created_at: s.created_at,
      },
    ])
  )

  const users = authUsers.map((u) => {
    const memberships = membersByUser.get(u.id) || []
    const signup = signupByUser.get(u.id) || null
    const isOwnerOfAny = memberships.some((m) => m.role === 'owner')
    const canCreate = signup?.status === 'approved'

    let tier: 'super_admin' | 'creator' | 'invited_only' | 'pending' | 'rejected' | 'unknown'
    if (isSuperAdmin(u.email)) tier = 'super_admin'
    else if (canCreate) tier = 'creator'
    else if (memberships.length > 0) tier = 'invited_only'
    else if (signup?.status === 'pending') tier = 'pending'
    else if (signup?.status === 'rejected') tier = 'rejected'
    else tier = 'unknown'

    return {
      id: u.id,
      email: u.email,
      full_name: (u.user_metadata?.full_name as string) || null,
      avatar_url: (u.user_metadata?.avatar_url as string) || null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      tier,
      signup,
      memberships,
      is_owner_of_any: isOwnerOfAny,
    }
  })

  // 최근 가입순 정렬
  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ users })
}
