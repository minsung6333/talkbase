import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function createAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite_token')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = data.user
  const admin = createAdmin()
  const now = new Date().toISOString()

  let claimedWorkspaceId: string | null = null

  // 1. 초대 토큰이 있으면 처리
  if (inviteToken) {
    const { data: invite } = await admin
      .from('workspace_invites')
      .select('id, workspace_id, email, expires_at, used_at')
      .eq('token', inviteToken)
      .maybeSingle()

    if (invite && !invite.used_at && invite.expires_at >= now && invite.email === user.email) {
      // workspace_members pending 레코드 업데이트
      await admin
        .from('workspace_members')
        .update({
          user_id: user.id,
          joined_at: now,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .eq('workspace_id', invite.workspace_id)
        .eq('email', invite.email)
        .is('user_id', null)

      // 토큰 사용 처리
      await admin
        .from('workspace_invites')
        .update({ used_at: now })
        .eq('id', invite.id)

      claimedWorkspaceId = invite.workspace_id
    } else if (invite && invite.email !== user.email) {
      // 이메일 불일치 → 초대 페이지로 리다이렉트 (에러 표시)
      return NextResponse.redirect(
        `${origin}/invite?token=${inviteToken}&error=email_mismatch&expected=${encodeURIComponent(invite.email)}`
      )
    }
  }

  // 2. 이메일로 pending workspace_members 자동 수락 (토큰 없는 기존 초대)
  const { data: pendingMembers } = await admin
    .from('workspace_members')
    .select('id, workspace_id')
    .eq('email', user.email!)
    .is('user_id', null)

  if (pendingMembers?.length) {
    await admin
      .from('workspace_members')
      .update({
        user_id: user.id,
        joined_at: now,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .eq('email', user.email!)
      .is('user_id', null)
  }

  // 3. 워크스페이스 쿠키 설정
  // 우선순위: 방금 수락한 초대 > 기존 워크스페이스 > pending 중 첫 번째
  let workspaceId: string | null = claimedWorkspaceId

  if (!workspaceId) {
    const { data: existingMember } = await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    workspaceId = existingMember?.workspace_id || null
  }

  if (!workspaceId && pendingMembers?.length) {
    workspaceId = pendingMembers[0].workspace_id
  }

  const destination = workspaceId ? `${origin}/` : `${origin}/workspaces`
  const res = NextResponse.redirect(destination)

  if (workspaceId) {
    res.cookies.set(WORKSPACE_COOKIE, workspaceId, {
      maxAge: WORKSPACE_COOKIE_MAX_AGE,
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
    })
  }

  return res
}
