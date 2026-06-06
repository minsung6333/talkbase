import { createClient } from '@/lib/supabase/server'
import { putChunk, tempChunkKey } from '@/lib/r2-multipart'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// 청크 PUT (R2 임시 객체로 저장)
// 청크 크기는 4MB 권장 (Vercel Hobby 4.5MB body 한도 안)
// R2 multipart 안 쓰므로 청크 크기 제한 없음
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const fileKey = url.searchParams.get('fileKey')
    const partNumber = Number(url.searchParams.get('partNumber'))

    if (!fileKey || !partNumber) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const arrayBuffer = await request.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length === 0) {
      return NextResponse.json({ error: '빈 청크' }, { status: 400 })
    }

    const key = tempChunkKey(fileKey, partNumber)
    await putChunk(key, buffer)

    return NextResponse.json({ partNumber, size: buffer.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '청크 업로드 실패' },
      { status: 500 }
    )
  }
}
