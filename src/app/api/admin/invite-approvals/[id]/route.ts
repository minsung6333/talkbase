import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { isSuperAdmin } from '@/lib/admin'
import { sendInviteEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PATCH: 초대 승인/거절
// body: { action: 'approve' | 'reject', rejectReason?: string }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action, rejectReason } = await request.json()
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action은 approve 또는 reject' }, { status: 400 })
  }

  const d = db()
  const now = new Date().toISOString()

  // 승인 대상 조회
  const { data: approval } = await d
    .from('invite_approvals')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!approval) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (approval.status !== 'pending') {
    return NextResponse.json({ error: '이미 처리된 요청이에요' }, { status: 400 })
  }

  // 상태 업데이트
  await d
    .from('invite_approvals')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: now,
      reviewed_by: user.id,
      reject_reason: action === 'reject' ? (rejectReason || null) : null,
    })
    .eq('id', id)

  if (action === 'reject') {
    return NextResponse.json({ success: true })
  }

  // 승인: workspace_members pending + workspace_invites 토큰 생성 + 메일 발송
  const [{ data: workspace }, { data: requester }] = await Promise.all([
    d.from('workspaces').select('name').eq('id', approval.workspace_id).maybeSingle(),
    approval.requested_by
      ? d.from('workspace_members')
          .select('full_name, email')
          .eq('workspace_id', approval.workspace_id)
          .eq('user_id', approval.requested_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // 이미 멤버인지 다시 확인 (race condition 대비)
  const { data: existingMember } = await d
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', approval.workspace_id)
    .eq('email', approval.email)
    .maybeSingle()

  if (!existingMember) {
    await d.from('workspace_members').insert({
      workspace_id: approval.workspace_id,
      email: approval.email,
      role: approval.role,
      invited_by: approval.requested_by,
    })
  }

  // 초대 토큰 생성 (7일)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: invite, error: inviteErr } = await d
    .from('workspace_invites')
    .insert({
      workspace_id: approval.workspace_id,
      email: approval.email,
      invited_by: approval.requested_by,
      expires_at: expiresAt,
    })
    .select('token')
    .single()

  if (inviteErr || !invite?.token) {
    console.error('workspace_invites 생성 실패:', inviteErr)
    return NextResponse.json({
      success: false,
      error: `초대 토큰 생성 실패: ${inviteErr?.message || '알 수 없음'}`,
    }, { status: 500 })
  }

  // 초대 메일 발송
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talkbase-navy.vercel.app'
  const inviterName = requester?.full_name || requester?.email || '관리자'

  let emailSent = true
  let emailError: string | undefined
  try {
    await sendInviteEmail(approval.email, inviterName, appUrl, {
      workspaceName: workspace?.name,
      inviteToken: invite.token,
    })
  } catch (err) {
    console.error('초대 메일 발송 실패:', err)
    emailSent = false
    emailError = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json({
    success: true,
    emailSent,
    ...(emailError ? { emailError } : {}),
  })
}
