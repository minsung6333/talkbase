import { createClient } from '@/lib/supabase/server'
import { generateFileKey } from '@/lib/r2'
import { startMultipartUpload } from '@/lib/r2-multipart'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// 멀티파트 업로드 초기화
// 큰 파일(> 4MB)을 청크 단위로 R2에 누적 업로드하기 위한 첫 단계
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { filename, contentType, title, type, visibility, outputFormat, projectId } = await request.json()

    const fileKey = generateFileKey(user.id, filename)
    const uploadId = await startMultipartUpload(fileKey, contentType || 'audio/x-m4a')

    // Supabase에 recording 레코드 생성 (uploading 상태)
    const { data: recording, error } = await supabase
      .from('recordings')
      .insert({
        user_id: user.id,
        title,
        type,
        visibility,
        output_format: outputFormat,
        status: 'uploading',
        file_key: fileKey,
        project_id: projectId || null,
      })
      .select('id')
      .single()

    if (error || !recording) {
      return NextResponse.json({ error: error?.message || 'DB 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({
      recordingId: recording.id,
      fileKey,
      uploadId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '초기화 실패' },
      { status: 500 }
    )
  }
}
