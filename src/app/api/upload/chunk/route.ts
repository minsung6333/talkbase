import { createClient } from '@/lib/supabase/server'
import { uploadChunk } from '@/lib/r2-multipart'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// 단일 청크 업로드 (각 청크는 5MB 이상 권장, 마지막은 작아도 OK)
// Vercel Hobby body size 4.5MB 한계 안에서 동작
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const fileKey = formData.get('fileKey') as string
  const uploadId = formData.get('uploadId') as string
  const partNumber = Number(formData.get('partNumber'))
  const chunk = formData.get('chunk') as File

  if (!fileKey || !uploadId || !partNumber || !chunk) {
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  const buffer = Buffer.from(await chunk.arrayBuffer())
  const result = await uploadChunk(fileKey, uploadId, partNumber, buffer)

  return NextResponse.json(result)
}

// Body size 늘리기 (Vercel은 4.5MB가 한계지만 명시)
export const config = {
  api: {
    bodyParser: { sizeLimit: '5mb' },
  },
}
