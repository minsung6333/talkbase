import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { generateReport } from '@/lib/openai'
import { sendResultEmail } from '@/lib/email'
import { NextResponse } from 'next/server'
import type { SttResult } from '@/types'

export const maxDuration = 60

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST: 보고서 생성 (+ 옵션으로 메일 발송)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    addressee,           // 수신 호칭 ("부서장님")
    customPrompt,        // 추가 지시
    includeShareLink,    // 공유 링크 포함 여부
    sendEmail,           // 즉시 발송 여부
    emailTo,             // 발송 대상 이메일 (sendEmail = true일 때)
  } = await request.json()

  if (!addressee?.trim()) {
    return NextResponse.json({ error: '수신 호칭을 입력해주세요' }, { status: 400 })
  }

  const db = admin()

  // 녹음 데이터 조회
  const { data: recording } = await db
    .from('recordings')
    .select('*')
    .eq('id', id)
    .single()

  if (!recording) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!recording.stt_result) {
    return NextResponse.json({ error: 'STT 결과가 없어요' }, { status: 400 })
  }

  // 발신자 이름 조회
  const { data: member } = await db
    .from('team_members')
    .select('full_name, email, notification_email')
    .eq('user_id', user.id)
    .single()

  const senderName = member?.full_name || (member?.email?.split('@')[0]) || '담당자'

  // 공유 링크 처리
  let shareUrl: string | undefined
  if (includeShareLink) {
    let token = recording.share_token
    if (!token || !recording.share_enabled) {
      // 자동으로 공유 활성화 + 토큰 생성
      const { randomBytes } = await import('crypto')
      token = token || randomBytes(16).toString('hex')
      await db
        .from('recordings')
        .update({ share_token: token, share_enabled: true })
        .eq('id', id)
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talkbase-navy.vercel.app'
    shareUrl = `${baseUrl}/share/${token}`
  }

  const date = new Date(recording.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // 보고서 생성
  const reportText = await generateReport(
    recording.stt_result as SttResult[],
    recording.title,
    recording.type,
    date,
    {
      addressee: addressee.trim(),
      senderName,
      customPrompt: customPrompt?.trim() || undefined,
      shareUrl,
    }
  )

  // 옵션: 즉시 메일 발송
  let emailSent = false
  if (sendEmail && emailTo) {
    try {
      await sendResultEmail(
        emailTo,
        `[보고] ${recording.title}`,
        reportText,
        recording.notion_page_url || shareUrl || ''
      )
      emailSent = true
    } catch (err) {
      console.error('보고서 메일 발송 실패:', err)
    }
  }

  return NextResponse.json({
    report: reportText,
    shareUrl,
    emailSent,
    suggestedTo: member?.notification_email || member?.email,
  })
}
