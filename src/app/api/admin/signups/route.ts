import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { isSuperAdmin } from '@/lib/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// GET: 가입 신청 목록 (상태별 필터)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await db
    .from('user_signups')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  return NextResponse.json({ signups: data || [] })
}
