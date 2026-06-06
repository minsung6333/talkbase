import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendResultEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recording } = await db
    .from('recordings')
    .select('id, title, ai_result, notion_page_url, user_id')
    .eq('id', id)
    .single()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (recording.user_id !== user.id)
    return NextResponse.json({ error: '본인 녹음만 재발송할 수 있어요' }, { status: 403 })

  if (!recording.ai_result)
    return NextResponse.json({ error: '발송할 내용이 없어요' }, { status: 400 })

  const { data: member } = await db
    .from('team_members')
    .select('email, notification_email')
    .eq('user_id', user.id)
    .single()

  const toEmail = member?.notification_email || member?.email
  if (!toEmail) return NextResponse.json({ error: '이메일이 없어요' }, { status: 400 })

  await sendResultEmail(
    toEmail,
    recording.title,
    recording.ai_result,
    recording.notion_page_url || ''
  )

  return NextResponse.json({ success: true, to: toEmail })
}
