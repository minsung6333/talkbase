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

  // Vercel Blob URL은 file_key에 그대로 저장되어 있음
  return NextResponse.json({ url: recording.file_key })
}
