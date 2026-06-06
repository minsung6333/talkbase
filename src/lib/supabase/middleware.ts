import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from '@/lib/workspace'

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

  // 인증 불필요 경로
  const publicPaths = [
    '/login', '/auth/callback', '/invite',
    '/api/process/',
    '/share/', '/api/share/',
    '/help/',
    '/api/access-request',
    // PWA / 정적 자산
    '/manifest', '/sw.js', '/icon-', '/apple-icon', '/favicon',
    '/logo/', '/fonts/',
    '/opengraph-image', '/twitter-image',
  ]
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  // 1단계: 로그인 검증
  if (!user && !isPublicPath) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '로그인이 필요합니다', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2단계: 워크스페이스 컨텍스트 검증
  // 로그인은 됐지만 워크스페이스 컨텍스트가 필요한 경로에 진입한 경우
  if (user && !isPublicPath) {
    // 워크스페이스 검증 면제 경로 (워크스페이스 없어도 접근 가능)
    const workspaceExemptPaths = [
      '/workspaces',         // 워크스페이스 목록 + 만들기
      '/profile',            // 본인 프로필
      '/api/workspaces',     // 워크스페이스 API
      '/api/me',             // 본인 정보
      '/api/profile',        // 프로필 API
    ]
    const isWorkspaceExempt = workspaceExemptPaths.some(p =>
      request.nextUrl.pathname.startsWith(p)
    )

    if (!isWorkspaceExempt) {
      const cookieWorkspaceId = request.cookies.get(WORKSPACE_COOKIE)?.value

      // DB 조회를 위한 admin client
      const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      let validWorkspaceId: string | null = null

      // 쿠키에 ID가 있으면 멤버십 검증
      if (cookieWorkspaceId) {
        const { data: m } = await adminDb
          .from('workspace_members')
          .select('workspace_id')
          .eq('workspace_id', cookieWorkspaceId)
          .eq('user_id', user.id)
          .maybeSingle()
        if (m) validWorkspaceId = cookieWorkspaceId
      }

      // 쿠키가 없거나 무효하면 사용자의 첫 워크스페이스로 fallback
      if (!validWorkspaceId) {
        const { data: anyMember } = await adminDb
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
        if (anyMember?.workspace_id) {
          const id = anyMember.workspace_id as string
          validWorkspaceId = id
          // 쿠키 자동 설정
          supabaseResponse.cookies.set(WORKSPACE_COOKIE, id, {
            maxAge: WORKSPACE_COOKIE_MAX_AGE,
            httpOnly: false,
            path: '/',
            sameSite: 'lax',
          })
        }
      }

      // 워크스페이스가 하나도 없으면 /workspaces로 유도
      if (!validWorkspaceId) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: '워크스페이스가 필요해요', code: 'WORKSPACE_REQUIRED' },
            { status: 403 }
          )
        }
        const url = request.nextUrl.clone()
        url.pathname = '/workspaces'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
