import { createClient } from '@/lib/supabase/server'
import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Android Web Share Target 진입점.
 * 녹음 앱 공유 시트에서 파일을 받아 Vercel Blob에 곧바로 올리고,
 * 업로드 페이지로 리다이렉트하여 사용자가 제목·유형 등을 입력하게 한다.
 *
 * GET 요청은 PWA가 manifest를 등록한 후 OS가 매니페스트 유효성 검사할 때 호출하기도 함 → /upload로 가볍게 리다이렉트.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/upload`)
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sharedTitle = (formData.get('title') as string | null) || null

    if (!file || file.size === 0) {
      return NextResponse.redirect(`${origin}/upload?share_error=no_file`)
    }

    // 500MB 한도 (기존 정책과 동일)
    const MAX_SIZE = 500 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.redirect(`${origin}/upload?share_error=too_large`)
    }

    // Vercel Blob에 업로드
    const blob = await put(`recordings/shared-${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type || 'audio/x-m4a',
      addRandomSuffix: false,
    })

    // 업로드 페이지로 리다이렉트하면서 blob URL + 파일명 전달
    const params = new URLSearchParams()
    params.set('blob_url', blob.url)
    params.set('filename', file.name)
    if (sharedTitle) params.set('title', sharedTitle)
    return NextResponse.redirect(`${origin}/upload?${params.toString()}`)
  } catch (err) {
    console.error('Share Target 업로드 실패:', err)
    return NextResponse.redirect(`${origin}/upload?share_error=upload_failed`)
  }
}
