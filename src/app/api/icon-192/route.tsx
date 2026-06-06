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
            gap: 8,
            height: 90,
          }}
        >
          <div style={{ width: 10, height: 24, background: 'white', borderRadius: 5 }} />
          <div style={{ width: 10, height: 56, background: 'white', borderRadius: 5 }} />
          <div style={{ width: 10, height: 90, background: 'white', borderRadius: 5 }} />
          <div style={{ width: 10, height: 56, background: 'white', borderRadius: 5 }} />
          <div style={{ width: 10, height: 24, background: 'white', borderRadius: 5 }} />
        </div>
      </div>
    ),
    {
      width: 192,
      height: 192,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/png',
      },
    }
  )
}
