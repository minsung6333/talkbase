import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Web Share Target 진입점.
 * 일반적으로 Service Worker가 가로채서 IndexedDB에 저장한 후 /upload?from_share=1로 리다이렉트한다.
 * 이 라우트는 SW가 아직 활성화되지 않았거나 비활성된 경우의 fallback.
 *
 * Vercel Serverless의 4.5MB request body 한도 때문에 큰 파일은 받지 못함 → 안내만.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/upload`)
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/upload?share_error=sw_required`)
}
