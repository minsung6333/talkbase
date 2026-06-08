import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** 본인 녹음 또는 워크스페이스 owner/admin이어야 공유 토글 가능 */
async function checkShareAuth(
  db: ReturnType<typeof admin>,
  recordingId: string,
  userId: string
): Promise<{ ok: boolean; recording: { user_id: string | null; workspace_id: string | null; share_token: string | null } | null }> {
  const { data: recording } = await db
    .from('recordings')
    .select('user_id, workspace_id, share_token')
    .eq('id', recordingId)
    .maybeSingle()
  if (!recording) return { ok: false, recording: null }
  if (recording.user_id === userId) return { ok: true, recording }
  if (recording.workspace_id) {
    const { data: member } = await db
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', recording.workspace_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (member && (member.role === 'owner' || member.role === 'admin')) {
      return { ok: true, recording }
    }
  }
  return { ok: false, recording }
}

// POST: 공유 활성화 (토큰 생성)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const { ok, recording } = await checkShareAuth(db, id, user.id)
  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!ok) return NextResponse.json({ error: '본인 녹음 또는 워크스페이스 관리자만 공유할 수 있어요' }, { status: 403 })

  // 기존 토큰이 있으면 재사용
  const token = recording.share_token || randomBytes(16).toString('hex')

  await db
    .from('recordings')
    .update({ share_token: token, share_enabled: true })
    .eq('id', id)

  return NextResponse.json({ token, enabled: true })
}

// DELETE: 공유 비활성화 (토큰 무효화는 안 함, 다시 켜면 같은 링크 재사용)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const { ok, recording } = await checkShareAuth(db, id, user.id)
  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.from('recordings').update({ share_enabled: false }).eq('id', id)
  return NextResponse.json({ enabled: false })
}
