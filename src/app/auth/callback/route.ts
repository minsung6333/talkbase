import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 서비스 롤 클라이언트 (RLS 우회, 서버에서만 사용)
function createAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const admin = createAdmin()

      // 허용된 팀원인지 확인 (서비스 롤로 RLS 우회)
      const { data: member } = await admin
        .from('team_members')
        .select('id, joined_at')
        .eq('email', data.user.email)
        .single()

      if (!member) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=unauthorized`)
      }

      // 첫 로그인 시 user_id, 이름, 아바타 업데이트
      if (!member.joined_at) {
        await admin
          .from('team_members')
          .update({
            joined_at: new Date().toISOString(),
            user_id: data.user.id,
            full_name: data.user.user_metadata?.full_name,
            avatar_url: data.user.user_metadata?.avatar_url,
          })
          .eq('email', data.user.email)
      }

      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
