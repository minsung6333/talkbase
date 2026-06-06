import { createClient } from '@/lib/supabase/server'
import { deleteChunk, tempChunkKey } from '@/lib/r2-multipart'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 업로드 중단 시 임시 청크들 삭제
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { fileKey, uploadedCount, recordingId } = await request.json()

    if (fileKey && uploadedCount) {
      // 업로드된 청크들 삭제 (병렬, 실패 무시)
      await Promise.all(
        Array.from({ length: uploadedCount }, (_, i) =>
          deleteChunk(tempChunkKey(fileKey, i + 1)).catch(() => {})
        )
      )
    }

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
