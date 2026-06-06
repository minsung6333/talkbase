import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { r2Client } from '@/lib/r2'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
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

  // 파일 키 조회
  const { data: recording } = await db
    .from('recordings')
    .select('file_key, user_id')
    .eq('id', id)
    .single()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (recording.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // R2에서 파일 삭제
  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: recording.file_key,
    }))
  } catch {}

  // DB에서 삭제
  await db.from('recordings').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
