import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const maxDuration = 60

// POST: AI 빠른 액션 (현재 ai_result 기반 수정)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { instruction } = await request.json()
  const db = admin()

  const { data: recording } = await db
    .from('recordings')
    .select('ai_result')
    .eq('id', id)
    .single()

  if (!recording?.ai_result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '사용자의 지시에 따라 회의록/요약 문서를 수정하세요. 형식과 구조는 최대한 유지하면서 지시사항만 반영하세요. 수정된 전체 문서를 반환하세요.',
      },
      {
        role: 'user',
        content: `다음 문서를 "${instruction}" 방식으로 수정해주세요:\n\n${recording.ai_result}`,
      },
    ],
    temperature: 0.3,
  })

  const edited = response.choices[0].message.content || ''

  await db.from('recordings').update({ ai_result: edited }).eq('id', id)

  return NextResponse.json({ aiResult: edited })
}

// PATCH: 직접 편집 저장
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { aiResult } = await request.json()

  const { error } = await admin()
    .from('recordings')
    .update({ ai_result: aiResult })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
