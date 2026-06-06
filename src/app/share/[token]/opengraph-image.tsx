import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const alt = 'TalkBase 공유'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TYPE_LABEL: Record<string, string> = {
  team_meeting: '팀 회의',
  client_meeting: '고객 미팅',
  phone_call: '통화',
  other: '기타',
}

function loadFont(name: string) {
  return readFileSync(path.join(process.cwd(), 'public/fonts', name))
}

export default async function Image({ params }: { params: { token: string } }) {
  const bold = loadFont('Pretendard-Bold.otf')
  const regular = loadFont('Pretendard-Regular.otf')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recording } = await db
    .from('recordings')
    .select('title, type, output_format, created_at, stt_result, share_enabled')
    .eq('share_token', params.token)
    .single()

  // 공유 비활성화 시 기본 이미지로
  if (!recording || !recording.share_enabled) {
    return defaultShareImage(bold, regular)
  }

  const date = new Date(recording.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // 화자 수 계산
  type Utt = { speaker: string }
  const speakers = Array.isArray(recording.stt_result)
    ? [...new Set((recording.stt_result as Utt[]).map(u => u.speaker))].length
    : 0

  // 발화 수 (대략적인 길이 추정용)
  const utteranceCount = Array.isArray(recording.stt_result) ? recording.stt_result.length : 0

  const { TEMPLATES } = await import('@/lib/templates')
  const template = TEMPLATES[recording.output_format as keyof typeof TEMPLATES] || TEMPLATES.minutes
  const isMinutes = recording.output_format === 'minutes'
  const formatLabel = `${template.emoji} ${template.name}`
  const typeLabel = TYPE_LABEL[recording.type] || '기타'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F8FF 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 80px',
          fontFamily: 'Pretendard',
          position: 'relative',
        }}
      >
        {/* 배경 장식 */}
        <div style={{
          position: 'absolute',
          top: -150,
          right: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,96,253,0.10) 0%, rgba(26,96,253,0) 70%)',
          display: 'flex',
        }} />

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LogoIcon size={48} />
            <span style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
              TalkBase
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#F1F5F9',
            color: '#64748B',
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 700,
          }}>
            🔒 읽기 전용 공유
          </div>
        </div>

        {/* 포맷 배지 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 80 }}>
          <div style={{
            display: 'flex',
            background: isMinutes ? '#1A60FD' : '#F59E0B',
            color: 'white',
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 700,
          }}>
            {formatLabel}
          </div>
          <div style={{
            display: 'flex',
            background: 'white',
            border: '2px solid #E2E8F0',
            color: '#64748B',
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 700,
          }}>
            {typeLabel}
          </div>
        </div>

        {/* 회의 제목 */}
        <div style={{
          display: 'flex',
          marginTop: 24,
          fontSize: recording.title.length > 20 ? 64 : 80,
          fontWeight: 700,
          color: '#0F172A',
          lineHeight: 1.2,
          letterSpacing: '-0.03em',
          maxWidth: '95%',
        }}>
          {recording.title}
        </div>

        {/* 메타 정보 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          marginTop: 40,
          fontSize: 26,
          color: '#64748B',
          fontWeight: 400,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>📅 {date}</span>
          {speakers > 0 && (
            <>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>👥 화자 {speakers}명</span>
            </>
          )}
          {utteranceCount > 0 && (
            <>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>💬 {utteranceCount}개 발화</span>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingTop: 32,
          borderTop: '1px solid #E2E8F0',
        }}>
          <span style={{ fontSize: 20, color: '#94A3B8' }}>
            ✨ AI가 정리한 회의록 · 링크로 누구나 열람 가능
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: bold, style: 'normal', weight: 700 },
        { name: 'Pretendard', data: regular, style: 'normal', weight: 400 },
      ],
    }
  )
}

function defaultShareImage(bold: Buffer, regular: Buffer) {
  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: 'Pretendard',
      }}>
        <LogoIcon size={120} />
        <span style={{ fontSize: 48, fontWeight: 700, color: '#0F172A' }}>TalkBase</span>
        <span style={{ fontSize: 28, color: '#64748B' }}>공유가 종료된 페이지예요</span>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: bold, style: 'normal', weight: 700 },
        { name: 'Pretendard', data: regular, style: 'normal', weight: 400 },
      ],
    }
  )
}

function LogoIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 239 239" style={{ display: 'flex' }}>
      <rect width="239" height="239" rx="46" fill="#1A60FD" />
      <ellipse cx="119" cy="143" rx="63" ry="11" fill="white" opacity="0.6" />
      <path d="M56 132 L56 144 Q56 152 119 152 Q182 152 182 144 L182 132 Z" fill="white" opacity="0.8" />
      <ellipse cx="119" cy="162" rx="63" ry="11" fill="white" opacity="0.6" />
      <path d="M56 151 L56 163 Q56 171 119 171 Q182 171 182 163 L182 151 Z" fill="white" opacity="0.8" />
      <ellipse cx="119" cy="181" rx="63" ry="11" fill="white" opacity="0.7" />
      <path d="M51 54 H139 Q182 54 182 96 Q182 139 139 139 H117 L91 162 V139 H51 Q51 96 51 96 Q51 54 51 54 Z" fill="#1A60FD" />
      <rect x="51" y="54" width="131" height="86" rx="43" fill="white" />
      <rect x="100" y="120" width="38" height="32" rx="7" fill="white" transform="rotate(-44 119 136)" />
      <rect x="81" y="91" width="8" height="13" rx="4" fill="#1A60FD" />
      <rect x="97" y="81" width="8" height="32" rx="4" fill="#1A60FD" />
      <rect x="113" y="73" width="8" height="49" rx="4" fill="#1A60FD" />
      <rect x="129" y="81" width="8" height="32" rx="4" fill="#1A60FD" />
      <rect x="145" y="91" width="8" height="13" rx="4" fill="#1A60FD" />
    </svg>
  )
}
