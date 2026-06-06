import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { del } from '@vercel/blob'
import { NextResponse } from 'next/server'

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
    .select('file_key, user_id')
    .eq('id', id)
    .single()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (recording.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Vercel Blob에서 파일 삭제
  try {
    if (recording.file_key.startsWith('http')) {
      await del(recording.file_key)
    }
  } catch {}

  await db.from('recordings').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
