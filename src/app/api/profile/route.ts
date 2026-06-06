import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

  const { data: member } = await admin()
    .from('team_members')
    .select('email, full_name, avatar_url, role, notification_email')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(member || {})
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notificationEmail } = await request.json()

  // 빈 문자열은 null로 (수신 이메일 해제)
  const value = notificationEmail?.trim() || null

  // 간단한 이메일 형식 검증
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return NextResponse.json({ error: '이메일 형식이 올바르지 않아요' }, { status: 400 })
  }

  const { error } = await admin()
    .from('team_members')
    .update({ notification_email: value })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, notificationEmail: value })
}
