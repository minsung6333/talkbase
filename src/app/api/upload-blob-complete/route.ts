import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { resolveCurrentWorkspace } from '@/lib/workspace'
import { submitTranscription } from '@/lib/rtzr'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Blob 업로드 완료 후: recording 레코드 생성 + STT 시작
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await resolveCurrentWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: '워크스페이스가 필요해요' }, { status: 403 })
  }

  try {
    const { blobUrl, filename, title, type, visibility, outputFormat, projectId, speakerCount } = await request.json()

    if (!blobUrl) {
      return NextResponse.json({ error: 'blobUrl 누락' }, { status: 400 })
    }

    const recordingData: Record<string, unknown> = {
      user_id: user.id,
      workspace_id: workspaceId,
      title,
      type,
      visibility,
      output_format: outputFormat,
      status: 'stt_processing',
      file_key: blobUrl,
      project_id: projectId || null,
    }
    if (speakerCount && Number(speakerCount) > 0) {
      recordingData.speaker_count = Number(speakerCount)
    }

    const { data: recording, error } = await supabase
      .from('recordings')
      .insert(recordingData)
      .select('id')
      .single()

    if (error || !recording) {
      return NextResponse.json({ error: error?.message || 'DB 저장 실패' }, { status: 500 })
    }

    try {
      const jobId = await submitTranscription(blobUrl, {
        speakerCount: speakerCount && Number(speakerCount) > 0 ? Number(speakerCount) : undefined,
      })

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

    return NextResponse.json({ recordingId: recording.id, filename })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '완료 실패' },
      { status: 500 }
    )
  }
}
