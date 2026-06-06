import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { isSuperAdmin } from '@/lib/admin'
import { sendSignupResultEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PATCH: 가입 신청 승인/거절
// body: { action: 'approve' | 'reject', rejectReason?: string }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action, rejectReason } = await request.json()
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action은 approve 또는 reject' }, { status: 400 })
  }

  const d = db()
  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const now = new Date().toISOString()

  const { data: updated, error } = await d
    .from('user_signups')
    .update({
      status: newStatus,
      reviewed_at: now,
      reviewed_by: user.id,
      reject_reason: action === 'reject' ? (rejectReason || null) : null,
      updated_at: now,
    })
    .eq('id', id)
    .select('email')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Not found' }, { status: 500 })
  }

  // 결과 메일 발송
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talkbase-navy.vercel.app'
  try {
    await sendSignupResultEmail(
      updated.email,
      action === 'approve',
      appUrl,
      action === 'reject' ? rejectReason : undefined
    )
  } catch (err) {
    console.error('결과 메일 발송 실패:', err)
  }

  return NextResponse.json({ success: true })
}
