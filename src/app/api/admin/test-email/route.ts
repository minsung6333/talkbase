import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin, getSuperAdminNotificationEmail } from '@/lib/admin'
import { sendSignupNotificationEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// POST: 슈퍼관리자에게 가입 알림 샘플 메일 즉시 발송
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminEmail = getSuperAdminNotificationEmail()
  if (!adminEmail) {
    return NextResponse.json({
      success: false,
      error: 'SUPER_ADMIN_EMAILS 환경변수가 비어있어요',
      envCheck: {
        SUPER_ADMIN_EMAILS: !!process.env.SUPER_ADMIN_EMAILS,
        WORKS_SMTP_HOST: !!process.env.WORKS_SMTP_HOST,
        WORKS_SMTP_PORT: !!process.env.WORKS_SMTP_PORT,
        WORKS_SMTP_USER: !!process.env.WORKS_SMTP_USER,
        WORKS_SMTP_PASSWORD: !!process.env.WORKS_SMTP_PASSWORD,
        WORKS_SMTP_FROM: !!process.env.WORKS_SMTP_FROM,
      },
    }, { status: 500 })
  }

  const { origin } = new URL(request.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin

  try {
    await sendSignupNotificationEmail(
      adminEmail,
      {
        email: 'test-user@example.com',
        fullName: '테스트 사용자',
        avatarUrl: null,
      },
      appUrl
    )
    return NextResponse.json({
      success: true,
      sentTo: adminEmail,
      message: `✓ ${adminEmail}로 테스트 메일을 발송했어요. 메일함을 확인해주세요.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    return NextResponse.json({
      success: false,
      error: message,
      stack: stack?.split('\n').slice(0, 5).join('\n'),
      sentTo: adminEmail,
      envCheck: {
        SUPER_ADMIN_EMAILS: !!process.env.SUPER_ADMIN_EMAILS,
        WORKS_SMTP_HOST: process.env.WORKS_SMTP_HOST ? '✓' : '✗',
        WORKS_SMTP_PORT: process.env.WORKS_SMTP_PORT || '✗',
        WORKS_SMTP_USER: process.env.WORKS_SMTP_USER ? '✓ (' + process.env.WORKS_SMTP_USER + ')' : '✗',
        WORKS_SMTP_PASSWORD: process.env.WORKS_SMTP_PASSWORD ? '✓ (length: ' + process.env.WORKS_SMTP_PASSWORD.length + ')' : '✗',
        WORKS_SMTP_FROM: process.env.WORKS_SMTP_FROM || '✗',
      },
    }, { status: 500 })
  }
}
