import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { generateUniqueSlug, WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from '@/lib/workspace'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: 사용자가 속한 워크스페이스 목록 (역할 포함)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const { data } = await db
    .from('workspace_members')
    .select('role, workspaces(id, name, slug, created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true, nullsFirst: false })

  const workspaces = (data || [])
    .filter((row) => row.workspaces)
    .map((row) => ({
      ...(row.workspaces as unknown as { id: string; name: string; slug: string; created_at: string }),
      role: row.role,
    }))

  // 현재 활성 워크스페이스 ID
  const cookieStore = await cookies()
  const currentId = cookieStore.get(WORKSPACE_COOKIE)?.value || null

  return NextResponse.json({ workspaces, currentId })
}

// POST: 새 워크스페이스 만들기 (기존 멤버십이 있는 사람만 가능)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 })
  }

  const db = admin()

  // 워크스페이스 생성 가능 조건:
  //  1) 기존 멤버십이 있거나
  //  2) 슈퍼관리자가 가입 신청을 approved 처리한 사람
  const [{ count: memberCount }, { data: signup }] = await Promise.all([
    db.from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    db.from('user_signups')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const canCreate = (memberCount ?? 0) > 0 || signup?.status === 'approved'
  if (!canCreate) {
    return NextResponse.json(
      { error: '관리자 승인 후 워크스페이스를 만들 수 있어요' },
      { status: 403 }
    )
  }
  const slug = await generateUniqueSlug(name.trim())

  // 1. workspace 생성
  const { data: workspace, error: wsErr } = await db
    .from('workspaces')
    .insert({ name: name.trim(), slug, created_by: user.id })
    .select('id, name, slug')
    .single()

  if (wsErr || !workspace) {
    return NextResponse.json(
      { error: wsErr?.message || '생성 실패' },
      { status: 500 }
    )
  }

  // 2. 생성자를 owner로 등록
  const { error: memberErr } = await db
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      role: 'owner',
      joined_at: new Date().toISOString(),
    })

  if (memberErr) {
    // 롤백
    await db.from('workspaces').delete().eq('id', workspace.id)
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  // 3. 쿠키에 새 워크스페이스 설정
  const res = NextResponse.json({ workspace })
  res.cookies.set(WORKSPACE_COOKIE, workspace.id, {
    maxAge: WORKSPACE_COOKIE_MAX_AGE,
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
  })
  return res
}
