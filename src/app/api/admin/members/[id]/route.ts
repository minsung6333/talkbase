import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 어드민 권한 확인
  const { data: requester } = await admin
    .from('team_members')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (requester?.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없어요' }, { status: 403 })
  }

  // 삭제 대상 조회
  const { data: target } = await admin
    .from('team_members')
    .select('id, role, email')
    .eq('id', id)
    .single()

  if (!target) {
    return NextResponse.json({ error: '존재하지 않는 팀원이에요' }, { status: 404 })
  }

  // 본인 삭제 불가
  if (target.id === requester.id) {
    return NextResponse.json({ error: '본인은 삭제할 수 없어요' }, { status: 400 })
  }

  // 다른 어드민 삭제 불가
  if (target.role === 'admin') {
    return NextResponse.json({ error: '다른 어드민은 삭제할 수 없어요' }, { status: 400 })
  }

  // 삭제 실행
  const { error } = await admin.from('team_members').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, removed: target.email })
}
