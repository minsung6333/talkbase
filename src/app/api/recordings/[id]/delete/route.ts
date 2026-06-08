import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { del } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recording } = await db
    .from('recordings')
    .select('file_key, user_id, workspace_id')
    .eq('id', id)
    .maybeSingle()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 권한: 본인 녹음이거나, 해당 워크스페이스의 owner/admin
  const isOwner = recording.user_id === user.id
  let allowed = isOwner

  if (!allowed && recording.workspace_id) {
    const { data: member } = await db
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', recording.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (member && (member.role === 'owner' || member.role === 'admin')) {
      allowed = true
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: '삭제 권한이 없어요 (본인 녹음 또는 워크스페이스 관리자만 가능)' }, { status: 403 })
  }

  // Vercel Blob에서 파일 삭제
  try {
    if (recording.file_key?.startsWith('http')) {
      await del(recording.file_key)
    }
  } catch (err) {
    console.error('Blob 삭제 실패 (무시):', err)
  }

  await db.from('recordings').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
