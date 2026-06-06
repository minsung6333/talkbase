import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { resolveCurrentWorkspace } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await resolveCurrentWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: '워크스페이스가 필요해요' }, { status: 403 })
  }

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: recentRecordings },
    { data: weekStats },
    { data: projects },
  ] = await Promise.all([
    db.from('recordings')
      .select('id, title, type, status, output_format, duration_seconds, created_at, visibility, project_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(6),

    db.from('recordings')
      .select('id, duration_seconds, created_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .gte('created_at', weekAgo),

    db.from('projects')
      .select('id, name, space')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const totalCount = weekStats?.length || 0
  const totalSeconds = weekStats?.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) || 0
  const totalHours = Math.floor(totalSeconds / 3600)
  const totalMins = Math.floor((totalSeconds % 3600) / 60)

  return NextResponse.json({
    recentRecordings: recentRecordings || [],
    weekStats: {
      count: totalCount,
      duration: totalSeconds > 0
        ? totalHours > 0 ? `${totalHours}시간 ${totalMins}분` : `${totalMins}분`
        : null,
    },
    projects: projects || [],
    userName: user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || '사용자',
  })
}
