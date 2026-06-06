import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 제목 + STT 내용 + AI 결과물 검색
  const { data } = await db
    .from('recordings')
    .select('id, title, type, status, output_format, created_at, visibility, ai_result, stt_result')
    .or(`visibility.eq.team,user_id.eq.${user.id}`)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!data) return NextResponse.json({ results: [] })

  const lowerQ = q.toLowerCase()

  const results = data
    .map(r => {
      // 매칭 점수 계산
      let score = 0
      let snippet = ''

      // 제목 매칭 (가중치 높음)
      if (r.title.toLowerCase().includes(lowerQ)) {
        score += 10
      }

      // AI 결과물 매칭
      if (r.ai_result?.toLowerCase().includes(lowerQ)) {
        score += 5
        const idx = r.ai_result.toLowerCase().indexOf(lowerQ)
        const start = Math.max(0, idx - 40)
        const end = Math.min(r.ai_result.length, idx + 80)
        snippet = (start > 0 ? '...' : '') + r.ai_result.slice(start, end) + (end < r.ai_result.length ? '...' : '')
      }

      // STT 전문 매칭
      if (!snippet && Array.isArray(r.stt_result)) {
        const match = r.stt_result.find((u: { text: string }) =>
          u.text?.toLowerCase().includes(lowerQ)
        )
        if (match) {
          score += 3
          snippet = `"${match.text}"`
        }
      }

      return score > 0 ? { ...r, score, snippet, stt_result: undefined, ai_result: undefined } : null
    })
    .filter(Boolean)
    .sort((a, b) => (b?.score || 0) - (a?.score || 0))
    .slice(0, 20)

  return NextResponse.json({ results })
}
