import { ImageResponse } from 'next/og'

export const runtime = 'edge'

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
            gap: 22,
            height: 240,
          }}
        >
          <div style={{ width: 28, height: 64, background: 'white', borderRadius: 14 }} />
          <div style={{ width: 28, height: 150, background: 'white', borderRadius: 14 }} />
          <div style={{ width: 28, height: 240, background: 'white', borderRadius: 14 }} />
          <div style={{ width: 28, height: 150, background: 'white', borderRadius: 14 }} />
          <div style={{ width: 28, height: 64, background: 'white', borderRadius: 14 }} />
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
