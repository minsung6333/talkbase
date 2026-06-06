import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { r2Client } from '@/lib/r2'
import { PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 어드민이 호출하면 R2 CORS를 강제로 재설정
// R2 대시보드의 설정이 캐싱되거나 적용 안 되는 문제 해결
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: member } = await admin
    .from('team_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (member?.role !== 'admin') {
    return NextResponse.json({ error: '어드민만 가능' }, { status: 403 })
  }

  const bucket = process.env.R2_BUCKET_NAME!

  try {
    // 현재 CORS 조회
    let before: object | null = null
    try {
      const current = await r2Client.send(new GetBucketCorsCommand({ Bucket: bucket }))
      before = current.CORSRules || null
    } catch {
      before = null
    }

    // 새 CORS 강제 적용
    await r2Client.send(new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }))

    // 적용 확인
    const after = await r2Client.send(new GetBucketCorsCommand({ Bucket: bucket }))

    return NextResponse.json({
      success: true,
      bucket,
      before,
      after: after.CORSRules,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : '실패',
      detail: String(err),
    }, { status: 500 })
  }
}

// GET으로 현재 CORS 조회만
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bucket = process.env.R2_BUCKET_NAME!
  try {
    const current = await r2Client.send(new GetBucketCorsCommand({ Bucket: bucket }))
    return NextResponse.json({ bucket, cors: current.CORSRules })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : '실패',
      detail: String(err),
    }, { status: 500 })
  }
}
