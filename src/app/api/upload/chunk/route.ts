import { createClient } from '@/lib/supabase/server'
import { uploadChunk } from '@/lib/r2-multipart'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// 청크 PUT
// 쿼리스트링으로 메타데이터 받고, body는 raw binary (Vercel body limit 회피)
// 청크 크기 5MB 권장 (R2 multipart 최소). 단, Vercel 4.5MB 한도 이슈로 4MB로 보냄
// → 마지막 청크는 더 작아도 OK, 나머지는 5MB여야 R2가 받음
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const fileKey = url.searchParams.get('fileKey')
    const uploadId = url.searchParams.get('uploadId')
    const partNumber = Number(url.searchParams.get('partNumber'))

    if (!fileKey || !uploadId || !partNumber) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    // raw body 읽기
    const arrayBuffer = await request.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length === 0) {
      return NextResponse.json({ error: '빈 청크' }, { status: 400 })
    }

    const result = await uploadChunk(fileKey, uploadId, partNumber, buffer)
    return NextResponse.json({ ...result, size: buffer.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '청크 업로드 실패' },
      { status: 500 }
    )
  }
}
