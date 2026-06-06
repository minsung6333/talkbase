import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getWorkspaceRole } from '@/lib/workspace'
import { sendInviteEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: 워크스페이스 멤버 목록
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await getWorkspaceRole(id, user.id)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await db()
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', id)
    .order('invited_at', { ascending: true })

  return NextResponse.json({ members: data || [] })
}

// POST: 멤버 초대 (admin/owner)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const d = db()

  // 권한 확인 + 초대자 정보 + 워크스페이스 이름
  const [{ data: inviterMember }, { data: workspace }] = await Promise.all([
    d.from('workspace_members')
      .select('role, full_name, email')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    d.from('workspaces').select('name').eq('id', id).maybeSingle(),
  ])

  if (!inviterMember || inviterMember.role === 'member') {
    return NextResponse.json({ error: '초대 권한이 없어요 (admin/owner만 가능)' }, { status: 403 })
  }

  const { email } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: '이메일을 입력해주세요' }, { status: 400 })

  // 중복 확인
  const { data: existing } = await d
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', id)
    .eq('email', email.trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 이 워크스페이스의 멤버예요' }, { status: 400 })
  }

  // workspace_members에 pending 레코드 추가
  const { error: memberErr } = await d.from('workspace_members').insert({
    workspace_id: id,
    email: email.trim(),
    role: 'member',
    invited_by: user.id,
  })

  if (memberErr) return NextResponse.json({ error: '초대 실패' }, { status: 500 })

  // workspace_invites 토큰 생성 (7일 유효)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: invite } = await d
    .from('workspace_invites')
    .insert({
      workspace_id: id,
      email: email.trim(),
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select('token')
    .single()

  // 초대 메일 발송
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talkbase-navy.vercel.app'
  const inviterName = inviterMember.full_name || inviterMember.email || '관리자'
  const workspaceName = workspace?.name

  let emailSent = true
  try {
    await sendInviteEmail(email.trim(), inviterName, appUrl, {
      workspaceName,
      inviteToken: invite?.token,
    })
  } catch {
    emailSent = false
  }

  return NextResponse.json({ success: true, emailSent })
}
