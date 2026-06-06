import { createClient as createAdmin } from '@supabase/supabase-js'
import { generateAiResult } from '@/lib/openai'
import { NextResponse } from 'next/server'
import type { SttResult, OutputFormat } from '@/types'

export const maxDuration = 60

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST: STT 원본 기반 재생성
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { outputFormat, customPrompt } = await request.json()

  const db = admin()
  const { data: recording } = await db
    .from('recordings')
    .select('title, type, created_at, stt_result')
    .eq('id', id)
    .single()

  if (!recording?.stt_result) return NextResponse.json({ error: 'STT 결과 없음' }, { status: 404 })

  const date = new Date(recording.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // STT 원본 기반으로 재생성 (customPrompt 추가 반영)
  let aiResult = await generateAiResult(
    recording.stt_result as SttResult[],
    outputFormat as OutputFormat,
    recording.title,
    recording.type,
    date,
    customPrompt  // 추가 지시사항
  )

  await db.from('recordings').update({
    ai_result: aiResult,
    output_format: outputFormat,
  }).eq('id', id)

  return NextResponse.json({ aiResult })
}
