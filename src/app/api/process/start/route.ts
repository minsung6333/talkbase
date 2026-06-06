import { createClient } from '@/lib/supabase/server'
import { getDownloadPresignedUrl } from '@/lib/r2'
import { submitTranscription } from '@/lib/rtzr'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recordingId, fileKey } = await request.json()

  try {
    // R2 파일 접근 URL 생성 (1시간 유효)
    const audioUrl = await getDownloadPresignedUrl(fileKey)

    // 리턴제로 STT 요청
    const jobId = await submitTranscription(audioUrl)

    // DB 업데이트: STT 처리 중
    await supabase
      .from('recordings')
      .update({
        status: 'stt_processing',
        rtzr_job_id: jobId,
      })
      .eq('id', recordingId)

    return NextResponse.json({ success: true, jobId })
  } catch (err) {
    await supabase
      .from('recordings')
      .update({ status: 'failed' })
      .eq('id', recordingId)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'STT 시작 실패' },
      { status: 500 }
    )
  }
}
