import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: recording } = await supabase
    .from('recordings')
    .select('file_key')
    .eq('id', id)
    .single()

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // file_key가 이미 Blob URL (https://...)이면 그대로 반환
  // 옛날 R2 키면 호환을 위해 R2 presign 시도
  const url = recording.file_key.startsWith('http')
    ? recording.file_key
    : await import('@/lib/r2').then(m => m.getDownloadPresignedUrl(recording.file_key))

  return NextResponse.json({ url })
}
