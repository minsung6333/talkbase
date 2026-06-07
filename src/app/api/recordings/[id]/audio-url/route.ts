import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // admin 클라이언트로 RLS 우회. 권한은 workspace_members 체크로 직접 검증.
  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recording } = await db
    .from('recordings')
    .select('file_key, workspace_id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 본인 녹음이거나 같은 워크스페이스 멤버여야 함
  const isOwner = recording.user_id === user.id
  if (!isOwner && recording.workspace_id) {
    const { data: member } = await db
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', recording.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Vercel Blob URL은 file_key에 그대로 저장되어 있음
  return NextResponse.json({ url: recording.file_key })
}
