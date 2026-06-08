import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * 폴더 관리 권한:
 *  - 본인이 created_by 거나
 *  - 같은 워크스페이스의 owner / admin
 */
async function canManageProject(
  db: ReturnType<typeof admin>,
  projectId: string,
  userId: string
): Promise<{ allowed: boolean; project?: { workspace_id: string | null; created_by: string | null } }> {
  const { data: project } = await db
    .from('projects')
    .select('workspace_id, created_by')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return { allowed: false }
  if (project.created_by === userId) return { allowed: true, project }

  if (project.workspace_id) {
    const { data: member } = await db
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (member && (member.role === 'owner' || member.role === 'admin')) {
      return { allowed: true, project }
    }
  }
  return { allowed: false, project }
}

// DELETE: 폴더 삭제 (안의 녹음은 미분류로 이동)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const { allowed, project } = await canManageProject(db, id, user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: '폴더 삭제 권한이 없어요 (본인이 만든 폴더 또는 워크스페이스 관리자만 가능)' }, { status: 403 })

  // 폴더 내 녹음들 project_id 해제
  await db.from('recordings').update({ project_id: null }).eq('project_id', id)

  // 폴더 삭제
  const { error } = await db.from('projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// PATCH: 폴더 이름 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const { allowed, project } = await canManageProject(db, id, user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: '폴더 수정 권한이 없어요' }, { status: 403 })

  const { name } = await request.json()
  const { data, error } = await db
    .from('projects')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
