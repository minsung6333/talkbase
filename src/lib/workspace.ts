import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const WORKSPACE_COOKIE = 'tb_workspace_id'
export const WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1년

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface Workspace {
  id: string
  name: string
  slug: string
  created_by: string
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string | null
  email: string
  full_name: string | null
  avatar_url: string | null
  role: WorkspaceRole
  notification_email: string | null
  invited_by: string | null
  invited_at: string
  joined_at: string | null
}

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * 현재 요청의 쿠키에서 워크스페이스 ID를 읽음.
 * 없거나 멤버가 아니면 null 반환.
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies()
  const id = cookieStore.get(WORKSPACE_COOKIE)?.value
  return id || null
}

/**
 * 쿠키에서 워크스페이스 ID를 읽고, 실제로 사용자가 그 워크스페이스의 멤버인지 검증.
 * 멤버가 아니면 사용자의 첫 워크스페이스로 자동 fallback.
 * 워크스페이스가 하나도 없으면 null.
 */
export async function resolveCurrentWorkspace(): Promise<{
  workspaceId: string | null
  member: WorkspaceMember | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { workspaceId: null, member: null }

  const db = admin()
  const cookieWorkspaceId = await getCurrentWorkspaceId()

  // 쿠키에 ID가 있으면 멤버십 확인
  if (cookieWorkspaceId) {
    const { data: m } = await db
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', cookieWorkspaceId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (m) return { workspaceId: cookieWorkspaceId, member: m as WorkspaceMember }
  }

  // fallback: 사용자가 속한 첫 워크스페이스
  const { data: anyMember } = await db
    .from('workspace_members')
    .select('*')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (anyMember) {
    return {
      workspaceId: anyMember.workspace_id,
      member: anyMember as WorkspaceMember,
    }
  }

  return { workspaceId: null, member: null }
}

/**
 * 로그인된 사용자가 속한 모든 워크스페이스 목록 (역할 포함)
 */
export async function getUserWorkspaces(userId: string): Promise<
  Array<Workspace & { role: WorkspaceRole }>
> {
  const db = admin()
  const { data } = await db
    .from('workspace_members')
    .select('role, workspaces(*)')
    .eq('user_id', userId)

  if (!data) return []

  return data
    .filter((row) => row.workspaces)
    .map((row) => ({
      ...(row.workspaces as unknown as Workspace),
      role: row.role as WorkspaceRole,
    }))
}

/**
 * 지정 워크스페이스에서 사용자의 역할 (null이면 비멤버)
 */
export async function getWorkspaceRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const db = admin()
  const { data } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.role as WorkspaceRole) || null
}

/**
 * 권한 체크 헬퍼 — 부족하면 throw
 */
export function requireRole(
  current: WorkspaceRole | null,
  required: WorkspaceRole
): void {
  const order: Record<WorkspaceRole, number> = {
    member: 1,
    admin: 2,
    owner: 3,
  }
  if (!current || order[current] < order[required]) {
    throw new Error(`권한 부족: ${required} 필요`)
  }
}

/**
 * 이름에서 slug 생성 (URL용)
 * 예: "민성's 친구들" → "minsung-s-friends" 같은 식 (한글은 그대로 유지)
 */
export function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50) || 'workspace'
}

/**
 * 중복 안 되는 slug 생성 (이미 있으면 -2, -3 식)
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const db = admin()
  const base = generateSlug(name)
  let slug = base
  let n = 1
  while (true) {
    const { data } = await db
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return slug
    n++
    slug = `${base}-${n}`
  }
}
