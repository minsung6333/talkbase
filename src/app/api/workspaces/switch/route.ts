import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// POST: 워크스페이스 전환 (멤버십 검증 후 쿠키만 변경)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await request.json()
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId 필요' }, { status: 400 })
  }

  // 멤버십 검증
  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: member } = await db
    .from('workspace_members')
    .select('id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: '이 워크스페이스의 멤버가 아니에요' }, { status: 403 })
  }

  // 쿠키 설정
  const res = NextResponse.json({ success: true, role: member.role })
  res.cookies.set(WORKSPACE_COOKIE, workspaceId, {
    maxAge: WORKSPACE_COOKIE_MAX_AGE,
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
  })
  return res
}
