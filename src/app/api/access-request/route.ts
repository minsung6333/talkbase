import { sendAccessRequestEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, company, role, purpose } = body

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: '이름과 이메일은 필수예요' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '이메일 형식이 올바르지 않아요' }, { status: 400 })
    }

    await sendAccessRequestEmail({
      name: name.trim(),
      email: email.trim(),
      company: company?.trim() || undefined,
      role: role?.trim() || undefined,
      purpose: purpose?.trim() || undefined,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('access-request error:', err)
    return NextResponse.json({ error: '요청 처리 실패' }, { status: 500 })
  }
}
