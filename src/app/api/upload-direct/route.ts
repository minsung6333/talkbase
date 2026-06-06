import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { r2Client, generateFileKey, getDownloadPresignedUrl } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { submitTranscription } from '@/lib/rtzr'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// 서버 프록시 단일 업로드
// 클라이언트는 R2와 직접 통신하지 않음 → CORS 문제 회피
// 단, Vercel Hobby 한도(4.5MB body) 안에서만 동작
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const type = formData.get('type') as string
    const visibility = formData.get('visibility') as string
    const outputFormat = formData.get('outputFormat') as string
    const projectId = formData.get('projectId') as string | null

    if (!file || !title) {
      return NextResponse.json({ error: '파일 또는 제목 누락' }, { status: 400 })
    }

    const contentType = file.type || 'audio/x-m4a'
    const fileKey = generateFileKey(user.id, file.name)

    // R2에 직접 PUT (서버에서)
    const buffer = Buffer.from(await file.arrayBuffer())
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
    }))

    // Supabase에 recording 생성
    const { data: recording, error } = await supabase
      .from('recordings')
      .insert({
        user_id: user.id,
        title,
        type,
        visibility,
        output_format: outputFormat,
        status: 'stt_processing',
        file_key: fileKey,
        project_id: projectId || null,
      })
      .select('id')
      .single()

    if (error || !recording) {
      return NextResponse.json({ error: 'DB 저장 실패: ' + error?.message }, { status: 500 })
    }

    // STT 자동 시작
    try {
      const audioUrl = await getDownloadPresignedUrl(fileKey)
      const jobId = await submitTranscription(audioUrl)

      const db = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await db
        .from('recordings')
        .update({ rtzr_job_id: jobId })
        .eq('id', recording.id)
    } catch (err) {
      console.error('STT 시작 실패:', err)
    }

    return NextResponse.json({ recordingId: recording.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '업로드 실패' },
      { status: 500 }
    )
  }
}
