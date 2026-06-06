import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// maskable: 안드로이드 adaptive icon용. 80% safe zone 안에 핵심 컨텐츠.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1A60FD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 18,
            height: 180,
          }}
        >
          <div style={{ width: 22, height: 48, background: 'white', borderRadius: 11 }} />
          <div style={{ width: 22, height: 112, background: 'white', borderRadius: 11 }} />
          <div style={{ width: 22, height: 180, background: 'white', borderRadius: 11 }} />
          <div style={{ width: 22, height: 112, background: 'white', borderRadius: 11 }} />
          <div style={{ width: 22, height: 48, background: 'white', borderRadius: 11 }} />
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/png',
      },
    }
  )
}
