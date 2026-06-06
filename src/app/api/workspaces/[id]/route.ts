import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getWorkspaceRole, generateUniqueSlug } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PATCH: 워크스페이스 이름 변경 (admin/owner)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await getWorkspaceRole(id, user.id)
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: '권한이 없어요' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 })

  const slug = await generateUniqueSlug(name.trim())

  const { data, error } = await db()
    .from('workspaces')
    .update({ name: name.trim(), slug })
    .eq('id', id)
    .select('id, name, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: 워크스페이스 삭제 (owner만)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await getWorkspaceRole(id, user.id)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Owner만 워크스페이스를 삭제할 수 있어요' }, { status: 403 })
  }

  const d = db()

  // 연결된 데이터 삭제
  await d.from('recordings').delete().eq('workspace_id', id)
  await d.from('projects').delete().eq('workspace_id', id)
  await d.from('workspace_members').delete().eq('workspace_id', id)

  const { error } = await d.from('workspaces').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
