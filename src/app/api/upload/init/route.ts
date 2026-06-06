import { createClient } from '@/lib/supabase/server'
import { generateFileKey } from '@/lib/r2'
import { startMultipartUpload } from '@/lib/r2-multipart'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// 청크 업로드 초기화 (서버 프록시 모드)
// 사용자는 R2와 직접 통신하지 않음 → CORS 문제 회피
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType, title, type, visibility, outputFormat, projectId } = await request.json()

  const fileKey = generateFileKey(user.id, filename)
  const uploadId = await startMultipartUpload(fileKey, contentType || 'audio/x-m4a')

  // Supabase에 recording 레코드 생성
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    recordingId: recording.id,
    fileKey,
    uploadId,
  })
}
