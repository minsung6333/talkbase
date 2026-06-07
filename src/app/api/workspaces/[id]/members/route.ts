import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getWorkspaceRole } from '@/lib/workspace'
import { getSuperAdminNotificationEmail, isSuperAdmin } from '@/lib/admin'
import { sendInviteApprovalRequestEmail, sendInviteEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: 워크스페이스 멤버 목록 + 승인 대기 중인 초대
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

  const d = db()
  const [{ data: members }, { data: pendingApprovals }] = await Promise.all([
    d.from('workspace_members')
      .select('*')
      .eq('workspace_id', id)
      .order('invited_at', { ascending: true }),
    d.from('invite_approvals')
      .select('id, email, role, requested_by, created_at')
      .eq('workspace_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    members: members || [],
    pendingApprovals: pendingApprovals || [],
  })
}

// POST: 멤버 초대 요청 (슈퍼관리자 승인 큐로 들어감)
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
  const cleanEmail = email.trim().toLowerCase()

  // 이미 멤버인지 확인
  const { data: existingMember } = await d
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', id)
    .eq('email', cleanEmail)
    .maybeSingle()

  if (existingMember) {
    return NextResponse.json({ error: '이미 이 워크스페이스의 멤버예요' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talkbase-navy.vercel.app'
  const inviterName = inviterMember.full_name || inviterMember.email || '관리자'

  // 🚀 슈퍼관리자가 직접 초대한 경우 → 승인 큐 건너뛰고 즉시 발송
  if (isSuperAdmin(user.email)) {
    // workspace_members pending 추가
    const { data: existingMember } = await d
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', id)
      .eq('email', cleanEmail)
      .maybeSingle()

    if (!existingMember) {
      await d.from('workspace_members').insert({
        workspace_id: id,
        email: cleanEmail,
        role: 'member',
        invited_by: user.id,
      })
    }

    // 초대 토큰 발급
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: invite } = await d
      .from('workspace_invites')
      .insert({
        workspace_id: id,
        email: cleanEmail,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select('token')
      .single()

    // 메일 발송
    let emailSent = true
    try {
      await sendInviteEmail(cleanEmail, inviterName, appUrl, {
        workspaceName: workspace?.name,
        inviteToken: invite?.token,
      })
    } catch (err) {
      console.error('초대 메일 발송 실패:', err)
      emailSent = false
    }

    return NextResponse.json({ success: true, emailSent, autoApproved: true })
  }

  // 일반 owner/admin → 승인 큐 경로
  // 이미 pending 요청이 있는지 확인
  const { data: existingApproval } = await d
    .from('invite_approvals')
    .select('id')
    .eq('workspace_id', id)
    .eq('email', cleanEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingApproval) {
    return NextResponse.json({ error: '이미 승인 대기 중인 초대예요' }, { status: 400 })
  }

  // 승인 큐에 추가
  const { error: approvalErr } = await d.from('invite_approvals').insert({
    workspace_id: id,
    email: cleanEmail,
    role: 'member',
    requested_by: user.id,
    status: 'pending',
  })

  if (approvalErr) {
    return NextResponse.json({ error: '초대 요청 실패' }, { status: 500 })
  }

  // 슈퍼 관리자에게 알림 메일
  const adminEmail = getSuperAdminNotificationEmail()

  if (adminEmail) {
    try {
      await sendInviteApprovalRequestEmail(
        adminEmail,
        {
          inviterName,
          inviterEmail: inviterMember.email || '',
          inviteeEmail: cleanEmail,
          workspaceName: workspace?.name || '',
          role: 'member',
        },
        appUrl
      )
    } catch (err) {
      console.error('초대 승인 요청 메일 발송 실패:', err)
    }
  }

  return NextResponse.json({
    success: true,
    pendingApproval: true,
    message: '관리자 승인 후 초대 메일이 발송돼요',
  })
}
