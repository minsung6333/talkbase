import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recording } = await db
    .from('recordings')
    .select('file_key, share_enabled')
    .eq('share_token', token)
    .single()

  if (!recording || !recording.share_enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Blob URL이면 그대로, 옛날 R2 키면 호환 처리
  const url = recording.file_key.startsWith('http')
    ? recording.file_key
    : await import('@/lib/r2').then(m => m.getDownloadPresignedUrl(recording.file_key))

  return NextResponse.json({ url })
}
