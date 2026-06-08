import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 클라이언트가 Vercel Blob에 직접 업로드하기 위한 서버 측 핸들러
// 인증 + 업로드 권한 부여만 함 (파일은 클라이언트가 Blob에 직접 PUT)
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // 인증 체크
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('로그인이 필요해요')

        // 업로드 권한 부여
        return {
          allowedContentTypes: [
            'audio/x-m4a',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav',
            'audio/m4a',
            'audio/*',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          tokenPayload: JSON.stringify({
            userId: user.id,
            pathname,
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // 업로드 완료 후 추가 처리 필요 시 여기에
        console.log('Blob 업로드 완료:', blob.url, tokenPayload)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '업로드 실패' },
      { status: 400 }
    )
  }
}
