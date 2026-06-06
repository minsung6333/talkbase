import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SttResult } from '@/types'

// GET: 화자 목록 + 미리보기 반환
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: recording } = await supabase
    .from('recordings')
    .select('stt_result')
    .eq('id', id)
    .single()

  if (!recording?.stt_result) {
    return NextResponse.json({ speakers: [], preview: [] })
  }

  const sttResult: SttResult[] = recording.stt_result
  const uniqueSpeakers = [...new Set(sttResult.map(r => r.speaker))]

  return NextResponse.json({
    speakers: uniqueSpeakers,
    sttResult,  // 전체 STT 결과
  })
}

// POST: 화자 이름 매핑 저장 → AI 처리 시작
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { speakerMap } = await request.json()

  const { data: recording } = await supabase
    .from('recordings')
    .select('stt_result')
    .eq('id', id)
    .single()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updatedStt: SttResult[] = (recording.stt_result as SttResult[]).map(item => ({
    ...item,
    speaker: speakerMap[item.speaker] || item.speaker,
  }))

  await supabase
    .from('recordings')
    .update({
      speaker_map: speakerMap,
      stt_result: updatedStt,
      status: 'ai_processing',
    })
    .eq('id', id)

  // AI 처리를 백그라운드로 시작 (fire-and-forget)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  fetch(`${baseUrl}/api/process/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordingId: id }),
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
