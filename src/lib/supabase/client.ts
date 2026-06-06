import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 쿠키 만료 30일 → 브라우저 닫아도 로그인 유지
        get(name) {
          if (typeof document === 'undefined') return ''
          const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : ''
        },
        set(name, value, options) {
          if (typeof document === 'undefined') return
          const maxAge = options?.maxAge ?? 60 * 60 * 24 * 30 // 30일
          document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`
        },
        remove(name) {
          if (typeof document === 'undefined') return
          document.cookie = `${name}=; max-age=0; path=/`
        },
      },
    }
  )
}
