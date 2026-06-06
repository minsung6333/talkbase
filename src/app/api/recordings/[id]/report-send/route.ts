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

  const { reportText, emailTo } = await request.json()
  if (!reportText?.trim()) {
    return NextResponse.json({ error: '보고서 내용이 없어요' }, { status: 400 })
  }
  if (!emailTo?.trim()) {
    return NextResponse.json({ error: '수신 이메일을 입력해주세요' }, { status: 400 })
  }

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recording } = await db
    .from('recordings')
    .select('title, share_token, share_enabled, notion_page_url, user_id')
    .eq('id', id)
    .single()

  if (!recording || recording.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talkbase-navy.vercel.app'
  const linkUrl = (recording.share_enabled && recording.share_token)
    ? `${baseUrl}/share/${recording.share_token}`
    : (recording.notion_page_url || '')

  await sendResultEmail(
    emailTo.trim(),
    `[보고] ${recording.title}`,
    reportText,
    linkUrl
  )

  return NextResponse.json({ success: true })
}
