import { createClient as createAdmin } from '@supabase/supabase-js'
import { getDownloadPresignedUrl } from '@/lib/r2'
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

  const url = await getDownloadPresignedUrl(recording.file_key)
  return NextResponse.json({ url })
}
