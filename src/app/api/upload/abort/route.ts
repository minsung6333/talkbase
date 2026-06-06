import { createClient } from '@/lib/supabase/server'
import { abortMultipartUpload } from '@/lib/r2-multipart'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 업로드 중단 시 R2의 multipart 정리
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { fileKey, uploadId, recordingId } = await request.json()
    if (fileKey && uploadId) {
      await abortMultipartUpload(fileKey, uploadId).catch(() => {})
    }

    // recording도 failed 처리
    if (recordingId) {
      await supabase
        .from('recordings')
        .update({ status: 'failed' })
        .eq('id', recordingId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '중단 실패' },
      { status: 500 }
    )
  }
}
