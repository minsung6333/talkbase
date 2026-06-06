import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// PATCH: 녹음을 다른 폴더로 이동 (팀 공유 포함)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await request.json()
  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 대상 폴더의 space 확인 (팀/개인에 따라 visibility 자동 변경)
  let visibility = 'private'
  if (projectId) {
    const { data: project } = await db.from('projects').select('space').eq('id', projectId).single()
    visibility = project?.space === 'team' ? 'team' : 'private'
  }

  const { error } = await db
    .from('recordings')
    .update({ project_id: projectId || null, visibility })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
