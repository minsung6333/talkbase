import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1A60FD',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1.5,
            height: 14,
          }}
        >
          <div style={{ width: 2, height: 4, background: 'white', borderRadius: 1 }} />
          <div style={{ width: 2, height: 9, background: 'white', borderRadius: 1 }} />
          <div style={{ width: 2, height: 14, background: 'white', borderRadius: 1 }} />
          <div style={{ width: 2, height: 9, background: 'white', borderRadius: 1 }} />
          <div style={{ width: 2, height: 4, background: 'white', borderRadius: 1 }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
