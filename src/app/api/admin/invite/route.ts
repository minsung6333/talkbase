import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendInviteEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 어드민 권한 확인 + 초대자 이름 조회
  const { data: inviter } = await admin
    .from('team_members')
    .select('role, full_name, email')
    .eq('user_id', user.id)
    .single()

  if (inviter?.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없어요' }, { status: 403 })
  }

  const { email } = await request.json()

  // 이미 초대된 이메일인지 확인
  const { data: existing } = await admin
    .from('team_members')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json({ error: '이미 팀원으로 등록된 이메일이에요' }, { status: 400 })
  }

  // 팀원 추가
  const { error } = await admin.from('team_members').insert({
    email,
    role: 'member',
    invited_by: user.id,
  })

  if (error) {
    return NextResponse.json({ error: '초대 실패' }, { status: 500 })
  }

  // 초대 메일 발송 (실패해도 초대는 유효)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talkbase-navy.vercel.app'
  const inviterName = inviter.full_name || inviter.email || '관리자'

  let emailSent = true
  try {
    await sendInviteEmail(email, inviterName, appUrl)
  } catch (err) {
    console.error('초대 메일 발송 실패:', err)
    emailSent = false
  }

  return NextResponse.json({ success: true, emailSent })
}
