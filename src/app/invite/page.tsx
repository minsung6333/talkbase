import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import InviteClient from './InviteClient'

export const dynamic = 'force-dynamic'

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; expected?: string }>
}) {
  const { token, error, expected } = await searchParams

  if (!token) redirect('/login')

  // 에러 상태 표시 (claim 라우트에서 리다이렉트된 경우)
  if (error) {
    return (
      <InviteClient
        token={token}
        workspaceName=""
        inviterName=""
        invitedEmail=""
        error={error}
        expectedEmail={expected ? decodeURIComponent(expected) : undefined}
      />
    )
  }

  const d = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  // 초대 정보 조회
  const { data: invite } = await d
    .from('workspace_invites')
    .select('id, token, workspace_id, email, expires_at, used_at, invited_by')
    .eq('token', token)
    .maybeSingle()

  if (!invite || invite.used_at || invite.expires_at < now) {
    return (
      <InviteClient
        token={token}
        workspaceName=""
        inviterName=""
        invitedEmail={invite?.email || ''}
        error="expired"
      />
    )
  }

  // 워크스페이스 이름 + 초대자 이름 조회
  const [{ data: workspace }, { data: inviter }] = await Promise.all([
    d.from('workspaces').select('name').eq('id', invite.workspace_id).maybeSingle(),
    invite.invited_by
      ? d.from('workspace_members')
          .select('full_name, email')
          .eq('workspace_id', invite.workspace_id)
          .eq('user_id', invite.invited_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // 이미 로그인돼 있으면 바로 수락 처리
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect(`/api/invite/${token}/claim`)
  }

  return (
    <InviteClient
      token={token}
      workspaceName={workspace?.name || 'TalkBase'}
      inviterName={inviter?.full_name || inviter?.email || '관리자'}
      invitedEmail={invite.email}
    />
  )
}
