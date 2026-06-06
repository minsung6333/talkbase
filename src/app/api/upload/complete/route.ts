import { createClient } from '@/lib/supabase/server'
import { completeMultipartUpload, abortMultipartUpload } from '@/lib/r2-multipart'
import { submitTranscription } from '@/lib/rtzr'
import { getDownloadPresignedUrl } from '@/lib/r2'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

interface UploadedPart { PartNumber: number; ETag: string }

// 멀티파트 업로드 완료 + STT 자동 시작
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recordingId, fileKey, uploadId, parts } = await request.json()

  if (!recordingId || !fileKey || !uploadId || !Array.isArray(parts)) {
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  // 1. R2에 멀티파트 완료 통보
  try {
    await completeMultipartUpload(
      fileKey,
      uploadId,
      (parts as UploadedPart[]).sort((a, b) => a.PartNumber - b.PartNumber)
    )
  } catch (err) {
    // 실패 시 abort
    await abortMultipartUpload(fileKey, uploadId).catch(() => {})
    return NextResponse.json(
      { error: `업로드 완료 실패: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    )
  }

  // 2. STT 시작 (signed download URL 만들어서 RTZR에 전달)
  try {
    const audioUrl = await getDownloadPresignedUrl(fileKey)
    const jobId = await submitTranscription(audioUrl)

    const db = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await db
      .from('recordings')
      .update({ status: 'stt_processing', rtzr_job_id: jobId })
      .eq('id', recordingId)

    return NextResponse.json({ success: true, jobId })
  } catch (err) {
    const db = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await db.from('recordings').update({ status: 'failed' }).eq('id', recordingId)
    return NextResponse.json(
      { error: `STT 시작 실패: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    )
  }
}
