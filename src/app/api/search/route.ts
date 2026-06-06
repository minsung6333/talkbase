import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { resolveCurrentWorkspace } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await resolveCurrentWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: '워크스페이스가 필요해요' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await db
    .from('recordings')
    .select('id, title, type, status, output_format, created_at, visibility, ai_result, stt_result')
    .eq('workspace_id', workspaceId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!data) return NextResponse.json({ results: [] })

  const lowerQ = q.toLowerCase()

  const results = data
    .map(r => {
      let score = 0
      let snippet = ''

      if (r.title.toLowerCase().includes(lowerQ)) {
        score += 10
      }

      if (r.ai_result?.toLowerCase().includes(lowerQ)) {
        score += 5
        const idx = r.ai_result.toLowerCase().indexOf(lowerQ)
        const start = Math.max(0, idx - 40)
        const end = Math.min(r.ai_result.length, idx + 80)
        snippet = (start > 0 ? '...' : '') + r.ai_result.slice(start, end) + (end < r.ai_result.length ? '...' : '')
      }

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
