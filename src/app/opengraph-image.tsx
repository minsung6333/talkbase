import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const alt = 'TalkBase — 녹음된 대화를 업무 지식으로 바꾸다'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function loadFont(name: string) {
  return readFileSync(path.join(process.cwd(), 'public/fonts', name))
}

export default async function Image() {
  const bold = loadFont('Pretendard-Bold.otf')
  const regular = loadFont('Pretendard-Regular.otf')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #EFF4FF 0%, #FFFFFF 50%, #F0F8FF 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 80px',
          fontFamily: 'Pretendard',
          position: 'relative',
        }}
      >
        {/* 배경 장식 도형 */}
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,96,253,0.12) 0%, rgba(26,96,253,0) 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -150,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(122,165,253,0.15) 0%, rgba(122,165,253,0) 70%)',
          display: 'flex',
        }} />

        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LogoIcon size={56} />
          <span style={{ fontSize: 36, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
            TalkBase
          </span>
        </div>

        {/* 배지 */}
        <div style={{ display: 'flex', marginTop: 60 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#1A60FD15',
            border: '2px solid #1A60FD30',
            color: '#1A60FD',
            padding: '12px 22px',
            borderRadius: 999,
            fontSize: 24,
            fontWeight: 700,
          }}>
            ✨ AI가 회의의 모든 순간을 기록해드려요
          </div>
        </div>

        {/* 헤드라인 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 36,
          fontSize: 76,
          fontWeight: 700,
          color: '#0F172A',
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
        }}>
          <span style={{ display: 'flex' }}>회의는 더 집중하고,</span>
          <span style={{ display: 'flex' }}>
            정리는{' '}
            <span style={{ color: '#1A60FD', marginLeft: 18, marginRight: 18 }}>AI에게</span>
            {' '}맡기세요
          </span>
        </div>

        {/* 기능 태그 */}
        <div style={{ display: 'flex', gap: 12, marginTop: 50, flexWrap: 'wrap' }}>
          {['정확한 STT', '화자 분리', 'AI 요약', '액션 아이템', '팀 공유'].map((label) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              background: 'white',
              border: '1.5px solid #E2E8F0',
              color: '#475569',
              padding: '10px 20px',
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 24, color: '#64748B', fontWeight: 400 }}>
            녹음된 대화를 업무 지식으로 바꾸다
          </span>
          <span style={{ fontSize: 22, color: '#94A3B8', fontWeight: 400 }}>
            talkbase.app
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

function LogoIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 239 239" style={{ display: 'flex' }}>
      {/* 배경 둥근 사각형 */}
      <rect width="239" height="239" rx="46" fill="#1A60FD" />

      {/* 데이터베이스 스택 (3단) */}
      <ellipse cx="119" cy="143" rx="63" ry="11" fill="white" opacity="0.6" />
      <path d="M56 132 L56 144 Q56 152 119 152 Q182 152 182 144 L182 132 Z" fill="white" opacity="0.8" />
      <ellipse cx="119" cy="162" rx="63" ry="11" fill="white" opacity="0.6" />
      <path d="M56 151 L56 163 Q56 171 119 171 Q182 171 182 163 L182 151 Z" fill="white" opacity="0.8" />
      <ellipse cx="119" cy="181" rx="63" ry="11" fill="white" opacity="0.7" />

      {/* 말풍선 (둥근 사각형) */}
      <path d="M51 54 H139 Q182 54 182 96 Q182 139 139 139 H117 L91 162 V139 H51 Q51 96 51 96 Q51 54 51 54 Z" fill="#1A60FD" />
      <rect x="51" y="54" width="131" height="86" rx="43" fill="white" />

      {/* 말풍선 꼬리 */}
      <rect x="100" y="120" width="38" height="32" rx="7" fill="white" transform="rotate(-44 119 136)" />

      {/* 오디오 파형 5개 막대 */}
      <rect x="81" y="91" width="8" height="13" rx="4" fill="#1A60FD" />
      <rect x="97" y="81" width="8" height="32" rx="4" fill="#1A60FD" />
      <rect x="113" y="73" width="8" height="49" rx="4" fill="#1A60FD" />
      <rect x="129" y="81" width="8" height="32" rx="4" fill="#1A60FD" />
      <rect x="145" y="91" width="8" height="13" rx="4" fill="#1A60FD" />
    </svg>
  )
}
