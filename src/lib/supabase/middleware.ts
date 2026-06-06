import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 로그인 필요한 페이지 보호
  const publicPaths = [
    '/login', '/auth/callback', '/invite',
    '/api/process/',
    '/share/', '/api/share/',   // 공유 페이지 (인증 불필요)
    '/help/',                    // 도움말 (인증 불필요)
    '/api/access-request',       // 사용 요청 (비로그인 사용자가 요청)
    // PWA / 정적 자산 (인증 절대 불필요)
    '/manifest',                 // /manifest.webmanifest, /manifest.json
    '/sw.js',                    // Service Worker
    '/icon-',                    // /icon-192.png 등 모든 아이콘
    '/apple-icon',
    '/favicon',
    '/logo/',                    // /logo/*.svg
    '/fonts/',                   // /fonts/*.otf
    '/opengraph-image',          // OG 이미지
    '/twitter-image',
  ]
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublicPath) {
    // API 호출은 redirect 대신 401 응답 (POST → 405 발생 방지)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '로그인이 필요합니다', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }
    // 페이지는 로그인 화면으로 redirect
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
