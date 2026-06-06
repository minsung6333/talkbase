/**
 * PNG 아이콘 생성 스크립트
 *  - 진짜 TalkBase 로고 SVG (public/logo/) → PNG 변환
 *  - PWA용 192/512, maskable, Apple touch, favicon
 */
import sharp from 'sharp'
import { readFileSync } from 'fs'
import path from 'path'

const outDir = path.join(process.cwd(), 'public')

// 진짜 TalkBase 로고 (파란 배경 + 흰색 말풍선/DB)
const FILLED_SVG = readFileSync(path.join(outDir, 'logo/icon-filled.svg'))

// Maskable용 — 안전 영역(80%) 안에 핵심 컨텐츠가 들어가도록
// icon-filled.svg는 이미 모서리 여백이 있는 viewBox라 80% 비율로 줄여서 사용
const MASKABLE_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1A60FD"/>
  <g transform="translate(51.2, 51.2) scale(1.7155)">
    ${FILLED_SVG.toString().replace(/<svg[^>]*>/, '').replace('</svg>', '').replace(/<rect[^>]*fill="#1A60FD"[^>]*\/>/, '')}
  </g>
</svg>`

async function svgToPng(svg, size, filename) {
  const buf = Buffer.isBuffer(svg) ? svg : Buffer.from(svg)
  await sharp(buf)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, filename))
  console.log(`✓ ${filename} (${size}x${size})`)
}

console.log('TalkBase PWA 아이콘 생성...')
await svgToPng(FILLED_SVG, 192, 'icon-192.png')
await svgToPng(FILLED_SVG, 512, 'icon-512.png')
await svgToPng(MASKABLE_SVG, 512, 'icon-512-maskable.png')
await svgToPng(FILLED_SVG, 180, 'apple-icon.png')
await svgToPng(FILLED_SVG, 32, 'favicon-32.png')
console.log('완료!')
