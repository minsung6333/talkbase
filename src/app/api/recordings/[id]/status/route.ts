import { createClient } from '@/lib/supabase/server'
import { getTranscriptionResult } from '@/lib/rtzr'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: recording } = await supabase
    .from('recordings')
    .select('id, title, status, rtzr_job_id, file_key')
    .eq('id', id)
    .single()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // STT 처리 중이면 리턴제로에서 상태 확인
  if (recording.status === 'stt_processing' && recording.rtzr_job_id) {
    try {
      const result = await getTranscriptionResult(recording.rtzr_job_id)

      if (result.status === 'completed') {
        // RTZR은 start_at, duration을 밀리초(ms) 단위로 반환 → 초(s)로 변환
        const sttResult = result.results?.utterances?.map((u: {
          spk: number; start_at: number; duration: number; msg: string
        }) => ({
          speaker: `화자${u.spk + 1}`,
          start_at: u.start_at / 1000,
          duration: u.duration / 1000,
          text: u.msg,
        })) ?? []

        await supabase
          .from('recordings')
          .update({ status: 'speaker_mapping', stt_result: sttResult })
          .eq('id', id)

        return NextResponse.json({ ...recording, status: 'speaker_mapping' })
      }

      if (result.status === 'failed') {
        await supabase.from('recordings').update({ status: 'failed' }).eq('id', id)
        return NextResponse.json({ ...recording, status: 'failed' })
      }
    } catch {}
  }

  return NextResponse.json(recording)
}
