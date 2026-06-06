/**
 * 슈퍼 관리자 — 플랫폼 운영자 (가입/초대 승인 권한)
 * 환경변수 SUPER_ADMIN_EMAILS에 쉼표로 구분된 이메일 목록을 넣어둠
 */

function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false
  return getSuperAdminEmails().includes(email.toLowerCase())
}

/**
 * 슈퍼 관리자 알림 받을 메일 주소 — SUPER_ADMIN_EMAILS의 첫 번째 항목
 */
export function getSuperAdminNotificationEmail(): string | null {
  return getSuperAdminEmails()[0] || null
}
