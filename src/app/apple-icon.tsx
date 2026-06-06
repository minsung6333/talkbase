import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
            height: 80,
          }}
        >
          <div style={{ width: 10, height: 22, background: 'white', borderRadius: 5 }} />
          <div style={{ width: 10, height: 52, background: 'white', borderRadius: 5 }} />
          <div style={{ width: 10, height: 80, background: 'white', borderRadius: 5 }} />
          <div style={{ width: 10, height: 52, background: 'white', borderRadius: 5 }} />
          <div style={{ width: 10, height: 22, background: 'white', borderRadius: 5 }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
