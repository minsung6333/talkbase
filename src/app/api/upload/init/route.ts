import { createClient } from '@/lib/supabase/server'
import { generateFileKey } from '@/lib/r2'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// 청크 업로드 초기화 (multipart 안 씀 — 임시 객체로 저장 후 결합)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { filename, contentType, title, type, visibility, outputFormat, projectId } = await request.json()

    const fileKey = generateFileKey(user.id, filename)

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
      contentType: contentType || 'audio/x-m4a',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '초기화 실패' },
      { status: 500 }
    )
  }
}
