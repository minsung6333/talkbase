import { createClient } from '@/lib/supabase/server'
import { generateFileKey, getUploadPresignedUrl } from '@/lib/r2'
import { NextResponse } from 'next/server'
import type { RecordingType, Visibility, OutputFormat } from '@/types'

export async function POST(request: Request) {
  try {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('presign - user:', user?.id, 'authError:', authError?.message)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType, title, type, visibility, outputFormat, projectId } = await request.json()

  // R2 키 생성
  const fileKey = generateFileKey(user.id, filename)

  // Presigned URL 생성
  let uploadUrl: string
  try {
    uploadUrl = await getUploadPresignedUrl(fileKey, contentType)
  } catch (err) {
    console.error('R2 Presign 오류:', err)
    return NextResponse.json({ error: `R2 오류: ${err instanceof Error ? err.message : err}` }, { status: 500 })
  }

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
    console.error('Supabase insert 오류:', JSON.stringify(error))
    return NextResponse.json({ error: `DB 오류: ${error.message} (${error.code})` }, { status: 500 })
  }

  return NextResponse.json({
    uploadUrl,
    recordingId: recording.id,
    fileKey,
  })
  } catch(e) {
    console.error('presign 전체 오류:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
