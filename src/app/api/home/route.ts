import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    // 최근 녹음 5건 (팀 공유 + 내 것)
    db.from('recordings')
      .select('id, title, type, status, output_format, duration_seconds, created_at, visibility, project_id')
      .or(`visibility.eq.team,user_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(6),

    // 이번 주 통계
    db.from('recordings')
      .select('id, duration_seconds, created_at')
      .or(`visibility.eq.team,user_id.eq.${user.id}`)
      .eq('status', 'completed')
      .gte('created_at', weekAgo),

    // 프로젝트 목록 (최근 활동순)
    db.from('projects')
      .select('id, name, space')
      .or(`space.eq.team,owner_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  // 주간 통계 계산
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
