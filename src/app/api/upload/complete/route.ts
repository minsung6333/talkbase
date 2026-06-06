import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { assembleAndCleanup } from '@/lib/r2-multipart'
import { submitTranscription } from '@/lib/rtzr'
import { getDownloadPresignedUrl } from '@/lib/r2'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// 모든 청크 결합 → 최종 파일 PUT → 임시 청크 삭제 → STT 시작
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { recordingId, fileKey, totalChunks, contentType } = await request.json()

    if (!recordingId || !fileKey || !totalChunks) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }

    // 1. 청크 결합 + 최종 PUT + 임시 청크 정리
    try {
      await assembleAndCleanup(fileKey, totalChunks, contentType || 'audio/x-m4a')
    } catch (err) {
      return NextResponse.json(
        { error: `결합 실패: ${err instanceof Error ? err.message : err}` },
        { status: 500 }
      )
    }

    // 2. STT 시작
    const db = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const audioUrl = await getDownloadPresignedUrl(fileKey)
      const jobId = await submitTranscription(audioUrl)

      await db
        .from('recordings')
        .update({ status: 'stt_processing', rtzr_job_id: jobId })
        .eq('id', recordingId)

      return NextResponse.json({ success: true, jobId, recordingId })
    } catch (err) {
      await db.from('recordings').update({ status: 'failed' }).eq('id', recordingId)
      return NextResponse.json(
        { error: `STT 시작 실패: ${err instanceof Error ? err.message : err}` },
        { status: 500 }
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '완료 실패' },
      { status: 500 }
    )
  }
}
