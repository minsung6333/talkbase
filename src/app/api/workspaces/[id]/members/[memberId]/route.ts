import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getWorkspaceRole } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// DELETE: 멤버 내보내기 또는 본인 탈퇴
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: workspaceId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myRole = await getWorkspaceRole(workspaceId, user.id)
  if (!myRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const d = db()

  // 삭제 대상 조회
  const { data: target } = await d
    .from('workspace_members')
    .select('id, user_id, role, email')
    .eq('workspace_id', workspaceId)
    .eq('id', memberId)
    .maybeSingle()

  if (!target) return NextResponse.json({ error: '존재하지 않는 멤버예요' }, { status: 404 })

  const isSelf = target.user_id === user.id

  if (isSelf) {
    // 본인 탈퇴: owner가 혼자면 불가
    if (target.role === 'owner') {
      const { count } = await d
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner')
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: '워크스페이스에 owner가 본인뿐이에요. 다른 멤버에게 owner를 넘긴 후 탈퇴하세요.' },
          { status: 400 }
        )
      }
    }
  } else {
    // 타인 내보내기: admin/owner만 가능
    if (myRole === 'member') {
      return NextResponse.json({ error: '권한이 없어요' }, { status: 403 })
    }
    // admin은 owner를 내보낼 수 없음
    if (target.role === 'owner' && myRole !== 'owner') {
      return NextResponse.json({ error: 'Owner는 내보낼 수 없어요' }, { status: 403 })
    }
  }

  const { error } = await d
    .from('workspace_members')
    .delete()
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH: 역할 변경 (owner만)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: workspaceId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myRole = await getWorkspaceRole(workspaceId, user.id)
  if (myRole !== 'owner') {
    return NextResponse.json({ error: 'Owner만 역할을 변경할 수 있어요' }, { status: 403 })
  }

  const { role } = await request.json()
  if (!['owner', 'admin', 'member'].includes(role)) {
    return NextResponse.json({ error: '올바르지 않은 역할이에요' }, { status: 400 })
  }

  const d = db()

  // 본인 owner 강등 방지 (owner가 혼자일 때)
  const { data: target } = await d
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceId)
    .eq('id', memberId)
    .maybeSingle()

  if (!target) return NextResponse.json({ error: '존재하지 않는 멤버예요' }, { status: 404 })

  if (target.user_id === user.id && target.role === 'owner' && role !== 'owner') {
    const { count } = await d
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Owner가 본인뿐이에요. 다른 멤버를 먼저 owner로 올려주세요.' },
        { status: 400 }
      )
    }
  }

  const { data, error } = await d
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
