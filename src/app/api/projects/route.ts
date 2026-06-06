import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { resolveCurrentWorkspace } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: 현재 워크스페이스의 팀 폴더 + 내 개인 폴더
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await resolveCurrentWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: '워크스페이스가 필요해요' }, { status: 403 })
  }

  const db = admin()

  const [{ data: teamProjects }, { data: personalProjects }] = await Promise.all([
    db.from('projects').select('*').eq('workspace_id', workspaceId).eq('space', 'team').order('created_at'),
    db.from('projects').select('*').eq('workspace_id', workspaceId).eq('space', 'personal').eq('owner_id', user.id).order('created_at'),
  ])

  return NextResponse.json({
    team: teamProjects || [],
    personal: personalProjects || [],
  })
}

// POST: 새 폴더 생성
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await resolveCurrentWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: '워크스페이스가 필요해요' }, { status: 403 })
  }

  const { name, space } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: '폴더 이름을 입력해주세요' }, { status: 400 })

  const { data, error } = await admin()
    .from('projects')
    .insert({
      name: name.trim(),
      space,
      workspace_id: workspaceId,
      owner_id: space === 'personal' ? user.id : null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
