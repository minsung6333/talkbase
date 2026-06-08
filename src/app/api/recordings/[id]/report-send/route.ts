import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendResultEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

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
    .select('title, share_token, share_enabled, notion_page_url, user_id, workspace_id')
    .eq('id', id)
    .maybeSingle()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 권한: 본인 녹음이거나 같은 워크스페이스 멤버
  const isOwner = recording.user_id === user.id
  let allowed = isOwner

  if (!allowed && recording.workspace_id) {
    const { data: member } = await db
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', recording.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (member) allowed = true
  }

  if (!allowed) {
    return NextResponse.json({ error: '워크스페이스 멤버만 보고서를 보낼 수 있어요' }, { status: 403 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talkbase-navy.vercel.app'
  const linkUrl = (recording.share_enabled && recording.share_token)
    ? `${baseUrl}/share/${recording.share_token}`
    : (recording.notion_page_url || '')

  try {
    await sendResultEmail(
      emailTo.trim(),
      `[보고] ${recording.title}`,
      reportText,
      linkUrl
    )
  } catch (err) {
    console.error('보고서 메일 발송 실패:', err)
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : '메일 발송 실패',
    }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
