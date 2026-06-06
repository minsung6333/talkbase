import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: 초대 토큰 수락 (로그인 상태에서만 호출)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { origin } = new URL(request.url)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const d = db()
  const now = new Date().toISOString()

  // 토큰 유효성 확인
  const { data: invite } = await d
    .from('workspace_invites')
    .select('id, workspace_id, email, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite || invite.used_at || invite.expires_at < now) {
    return NextResponse.redirect(`${origin}/invite?token=${token}&error=expired`)
  }

  // 이메일 일치 확인 (이미 다른 계정으로 로그인된 경우 방지)
  if (invite.email !== user.email) {
    return NextResponse.redirect(
      `${origin}/invite?token=${token}&error=email_mismatch&expected=${encodeURIComponent(invite.email)}`
    )
  }

  // workspace_members pending 레코드 업데이트 (user_id, joined_at)
  await d
    .from('workspace_members')
    .update({
      user_id: user.id,
      joined_at: new Date().toISOString(),
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    })
    .eq('workspace_id', invite.workspace_id)
    .eq('email', invite.email)
    .is('user_id', null)

  // 토큰 사용 처리
  await d
    .from('workspace_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 워크스페이스 쿠키 설정 후 홈으로
  const res = NextResponse.redirect(`${origin}/`)
  res.cookies.set(WORKSPACE_COOKIE, invite.workspace_id, {
    maxAge: WORKSPACE_COOKIE_MAX_AGE,
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
  })
  return res
}
