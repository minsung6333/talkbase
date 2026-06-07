import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { isSuperAdmin } from '@/lib/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// DELETE: 유저 완전 삭제 (B안)
// - auth.users 삭제
// - workspace_members / user_signups / 본인 owner 워크스페이스 등 연관 데이터 정리
// - 본인이 owner인 워크스페이스가 다른 멤버 0명이면 함께 삭제, 멤버 있으면 거절
//   (멤버 있는 워크스페이스는 owner 위임 먼저 필요)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 본인 삭제 방지
  if (targetUserId === user.id) {
    return NextResponse.json({ error: '본인은 삭제할 수 없어요' }, { status: 400 })
  }

  const d = db()

  // 0. 대상 유저 이메일 조회 (차단 목록에 추가용)
  const { data: targetAuthData } = await d.auth.admin.getUserById(targetUserId)
  const targetEmail = targetAuthData?.user?.email?.toLowerCase() || null

  // 1. 본인이 owner인 워크스페이스 조회
  const { data: ownedRows } = await d
    .from('workspace_members')
    .select('workspace_id, workspaces(id, name)')
    .eq('user_id', targetUserId)
    .eq('role', 'owner')

  const ownerWorkspaceIds = (ownedRows || []).map((r) => r.workspace_id)

  // 각 owner 워크스페이스 멤버 수 확인
  const blockingWorkspaces: Array<{ id: string; name: string; memberCount: number }> = []
  const deletableWorkspaceIds: string[] = []

  for (const row of ownedRows || []) {
    const wsId = row.workspace_id
    const { count } = await d
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId)
      .neq('user_id', targetUserId)

    if ((count ?? 0) > 0) {
      const ws = row.workspaces as unknown as { id: string; name: string } | null
      blockingWorkspaces.push({
        id: wsId,
        name: ws?.name || '(unnamed)',
        memberCount: count ?? 0,
      })
    } else {
      deletableWorkspaceIds.push(wsId)
    }
  }

  if (blockingWorkspaces.length > 0) {
    return NextResponse.json({
      error: '이 유저가 owner인 워크스페이스에 다른 멤버가 있어요. 먼저 다른 owner로 위임하거나 워크스페이스를 정리해주세요.',
      blockingWorkspaces,
    }, { status: 409 })
  }

  // 2. owner 본인뿐인 워크스페이스 → 그 워크스페이스 통째로 삭제
  //    (recordings, projects, workspace_members CASCADE)
  for (const wsId of deletableWorkspaceIds) {
    await d.from('recordings').delete().eq('workspace_id', wsId)
    await d.from('projects').delete().eq('workspace_id', wsId)
    await d.from('workspace_invites').delete().eq('workspace_id', wsId)
    await d.from('invite_approvals').delete().eq('workspace_id', wsId)
    await d.from('workspace_members').delete().eq('workspace_id', wsId)
    await d.from('workspaces').delete().eq('id', wsId)
  }

  // 3. 그 외 workspace_members(이 유저의 멤버십)도 정리
  await d.from('workspace_members').delete().eq('user_id', targetUserId)

  // 4. user_signups 정리 (CASCADE될 가능성 높지만 명시적으로)
  await d.from('user_signups').delete().eq('user_id', targetUserId)

  // 5. invite_approvals 본인이 요청한 것 정리
  await d.from('invite_approvals').delete().eq('requested_by', targetUserId)

  // 6. workspace_invites 본인이 보낸 것은 보존 (invited_by만 무효 처리 X — 그냥 둠)
  //    토큰이 살아있어도 어차피 invited_by FK가 없어도 동작에 영향 적음

  // 7. 본인 user_id가 있는 recordings는 owner 워크스페이스가 사라졌으면 이미 삭제됨
  //    다른 워크스페이스에 올린 본인 녹음은? → workspace 단위로 보존 (워크스페이스 데이터)
  //    user_id만 dangling reference로 남음. 표시할 때 user join이 null 되겠지만 동작에 영향 X

  // 8. 마지막으로 auth.users 삭제
  const { error: authErr } = await d.auth.admin.deleteUser(targetUserId)
  if (authErr) {
    return NextResponse.json({
      success: false,
      error: `Auth 삭제 실패: ${authErr.message}`,
    }, { status: 500 })
  }

  // 9. 이메일을 차단 목록에 자동 추가 (같은 이메일로 재가입 차단)
  if (targetEmail) {
    await d
      .from('blocked_emails')
      .upsert({
        email: targetEmail,
        blocked_by: user.id,
        reason: '슈퍼관리자가 계정을 삭제함',
      }, { onConflict: 'email' })
  }

  return NextResponse.json({
    success: true,
    deletedWorkspaces: deletableWorkspaceIds.length,
    blockedEmail: targetEmail,
  })
}
