import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from '@/lib/workspace'
import { getSuperAdminNotificationEmail } from '@/lib/admin'
import { sendSignupNotificationEmail } from '@/lib/email'
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

  // 0. 차단된 이메일 체크 — 즉시 로그아웃 + 안내
  if (user.email) {
    const { data: blocked } = await admin
      .from('blocked_emails')
      .select('id')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()

    if (blocked) {
      // auth.users에서 즉시 삭제 (다시 만들어진 계정이라 새 ID)
      await admin.auth.admin.deleteUser(user.id)
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=blocked`)
    }
  }

  let claimedWorkspaceId: string | null = null

  // 1. 초대 토큰이 있으면 처리
  if (inviteToken) {
    const { data: invite } = await admin
      .from('workspace_invites')
      .select('id, workspace_id, email, expires_at, used_at')
      .eq('token', inviteToken)
      .maybeSingle()

    if (invite && !invite.used_at && invite.expires_at >= now && invite.email === user.email) {
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

      await admin
        .from('workspace_invites')
        .update({ used_at: now })
        .eq('id', invite.id)

      claimedWorkspaceId = invite.workspace_id
    } else if (invite && invite.email !== user.email) {
      return NextResponse.redirect(
        `${origin}/invite?token=${inviteToken}&error=email_mismatch&expected=${encodeURIComponent(invite.email)}`
      )
    }
  }

  // 2. 이메일로 pending workspace_members 자동 수락
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

  // 3. workspace_members에 있는 사람인지 확인 (있으면 자동 approved 처리 + 가입 신청 불필요)
  const { count: memberCount } = await admin
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const hasMembership = (memberCount ?? 0) > 0

  // 4. 워크스페이스 멤버가 아니라면 user_signups 처리
  if (!hasMembership) {
    const { data: existingSignup } = await admin
      .from('user_signups')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingSignup) {
      // 첫 가입 신청
      await admin.from('user_signups').insert({
        user_id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        status: 'pending',
      })

      // 슈퍼 관리자에게 알림 메일
      const adminEmail = getSuperAdminNotificationEmail()
      if (adminEmail) {
        try {
          await sendSignupNotificationEmail(
            adminEmail,
            {
              email: user.email!,
              fullName: user.user_metadata?.full_name || null,
              avatarUrl: user.user_metadata?.avatar_url || null,
            },
            origin
          )
        } catch (err) {
          console.error('가입 알림 메일 발송 실패:', err)
        }
      }
    } else if (existingSignup.status === 'rejected') {
      // 거절된 사용자가 재로그인 → 자동 재신청 (pending으로 되돌리고 카운터 증가)
      const { data: prev } = await admin
        .from('user_signups')
        .select('reapplied_count')
        .eq('id', existingSignup.id)
        .single()

      await admin
        .from('user_signups')
        .update({
          status: 'pending',
          reject_reason: null,
          reviewed_at: null,
          reviewed_by: null,
          reapplied_count: (prev?.reapplied_count ?? 0) + 1,
          updated_at: now,
        })
        .eq('id', existingSignup.id)

      const adminEmail = getSuperAdminNotificationEmail()
      if (adminEmail) {
        try {
          await sendSignupNotificationEmail(
            adminEmail,
            {
              email: user.email!,
              fullName: user.user_metadata?.full_name || null,
              avatarUrl: user.user_metadata?.avatar_url || null,
            },
            origin
          )
        } catch (err) {
          console.error('재신청 알림 메일 발송 실패:', err)
        }
      }
    }
    // existingSignup.status === 'pending' 이면 그대로 둠 (재신청 X)
    // existingSignup.status === 'approved' 이면 workspace_members 비어있는 이상 상태 — 그대로 두고 /workspaces로
  }

  // 5. 워크스페이스 쿠키 설정
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
