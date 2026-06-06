import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateAiResult } from '@/lib/openai'
import { createNotionPage } from '@/lib/notion'
import { sendResultEmail } from '@/lib/email'
import { NextResponse } from 'next/server'
import type { Recording, SttResult } from '@/types'

export const maxDuration = 60

function createAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const { recordingId } = await request.json()
  const admin = createAdmin()

  try {
    // 녹음 정보 조회
    const { data: recording } = await admin
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()

    if (!recording) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 업로더 이메일 조회 (notification_email 우선)
    const { data: member } = await admin
      .from('team_members')
      .select('email, full_name, avatar_url, notification_email')
      .eq('user_id', recording.user_id)
      .single()

    recording.user = member

    const sttResult: SttResult[] = recording.stt_result || []
    const date = new Date(recording.created_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    // 1. GPT로 회의록/요약 생성
    await admin.from('recordings').update({ status: 'ai_processing' }).eq('id', recordingId)

    const aiResult = await generateAiResult(
      sttResult,
      recording.output_format,
      recording.title,
      recording.type,
      date
    )

    // 2. Notion 페이지 생성
    await admin.from('recordings').update({ status: 'saving' }).eq('id', recordingId)

    const notionUrl = await createNotionPage(
      { ...recording, user: recording.user } as Recording,
      aiResult
    )

    // 3. DB 업데이트 (완료)
    await admin.from('recordings').update({
      status: 'completed',
      ai_result: aiResult,
      notion_page_url: notionUrl,
    }).eq('id', recordingId)

    // 4. 이메일 발송 (notification_email 우선, 없으면 로그인 이메일)
    const userEmail = recording.user?.notification_email || recording.user?.email
    if (userEmail) {
      await sendResultEmail(userEmail, recording.title, aiResult, notionUrl)
        .catch(err => console.error('이메일 발송 실패:', err))
    }

    return NextResponse.json({ success: true, notionUrl })
  } catch (err) {
    console.error('AI 처리 오류:', err)
    await admin.from('recordings').update({ status: 'failed' }).eq('id', recordingId)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI 처리 실패' },
      { status: 500 }
    )
  }
}
