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
  const projectId = searchParams.get('project_id')
  const noProject = searchParams.get('no_project')
  const space = searchParams.get('space') as 'team' | 'personal' | null

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = db
    .from('recordings')
    .select('id, title, type, status, output_format, created_at, project_id, visibility')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  } else if (noProject === 'true') {
    query = query.is('project_id', null)
    if (space === 'team') {
      query = query.eq('visibility', 'team')
    } else if (space === 'personal') {
      query = query.eq('visibility', 'private').eq('user_id', user.id)
    }
  }

  const { data, error } = await query.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ recordings: data || [] })
}
