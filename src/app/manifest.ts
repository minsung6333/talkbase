import type { MetadataRoute } from 'next'

// Web Share Target API — Android 공유 시트에서 오디오 파일 받기
// (TypeScript MetadataRoute.Manifest 타입엔 아직 없어서 확장 객체로 캐스팅)
type ExtendedManifest = MetadataRoute.Manifest & {
  share_target?: {
    action: string
    method: 'GET' | 'POST'
    enctype?: 'application/x-www-form-urlencoded' | 'multipart/form-data'
    params: {
      title?: string
      text?: string
      url?: string
      files?: Array<{ name: string; accept: string[] }>
    }
  }
}

export default function manifest(): ExtendedManifest {
  return {
    name: 'TalkBase',
    short_name: 'TalkBase',
    description: '녹음된 대화를 업무 지식으로 바꾸다',
    start_url: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1A60FD',
    lang: 'ko',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'business'],
    shortcuts: [
      {
        name: '녹음 업로드',
        short_name: '업로드',
        url: '/upload',
      },
      {
        name: '보관함',
        short_name: '보관함',
        url: '/history',
      },
    ],
    share_target: {
      action: '/upload/share',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        files: [
          {
            name: 'file',
            accept: [
              'audio/*',
              '.m4a',
              '.mp3',
              '.wav',
              'audio/x-m4a',
              'audio/mp4',
              'audio/mpeg',
              'audio/wav',
            ],
          },
        ],
      },
    },
  }
}
