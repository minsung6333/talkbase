/**
 * PNG 아이콘 생성 스크립트
 *  - SVG → PNG 변환 (sharp)
 *  - PWA용 192/512 + maskable
 *  - 정적 PNG가 Chrome PWA 인식에 가장 안정적
 */
import sharp from 'sharp'
import { writeFile } from 'fs/promises'
import path from 'path'

const SIMPLE_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#1A60FD"/>
  <g transform="translate(256, 256)">
    <rect x="-110" y="-30" width="40" height="60" rx="20" fill="white"/>
    <rect x="-55" y="-90" width="40" height="180" rx="20" fill="white"/>
    <rect x="0" y="-150" width="40" height="300" rx="20" fill="white"/>
    <rect x="55" y="-90" width="40" height="180" rx="20" fill="white"/>
    <rect x="110" y="-30" width="40" height="60" rx="20" fill="white"/>
  </g>
</svg>`

// maskable: 80% safe zone 안에 컨텐츠 배치 (모서리 잘림 대비)
const MASKABLE_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1A60FD"/>
  <g transform="translate(256, 256) scale(0.78)">
    <rect x="-110" y="-30" width="40" height="60" rx="20" fill="white"/>
    <rect x="-55" y="-90" width="40" height="180" rx="20" fill="white"/>
    <rect x="0" y="-150" width="40" height="300" rx="20" fill="white"/>
    <rect x="55" y="-90" width="40" height="180" rx="20" fill="white"/>
    <rect x="110" y="-30" width="40" height="60" rx="20" fill="white"/>
  </g>
</svg>`

const FAVICON_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="14" fill="#1A60FD"/>
  <g transform="translate(32, 32)">
    <rect x="-14" y="-4" width="5" height="8" rx="2.5" fill="white"/>
    <rect x="-7" y="-11" width="5" height="22" rx="2.5" fill="white"/>
    <rect x="0" y="-18" width="5" height="36" rx="2.5" fill="white"/>
    <rect x="7" y="-11" width="5" height="22" rx="2.5" fill="white"/>
    <rect x="14" y="-4" width="5" height="8" rx="2.5" fill="white"/>
  </g>
</svg>`

const outDir = path.join(process.cwd(), 'public')

async function svgToPng(svg, size, filename) {
  const buf = Buffer.from(svg)
  await sharp(buf)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, filename))
  console.log(`✓ ${filename} (${size}x${size})`)
}

console.log('PWA 아이콘 생성 중...')
await svgToPng(SIMPLE_SVG, 192, 'icon-192.png')
await svgToPng(SIMPLE_SVG, 512, 'icon-512.png')
await svgToPng(MASKABLE_SVG, 512, 'icon-512-maskable.png')
await svgToPng(SIMPLE_SVG, 180, 'apple-icon.png')
await svgToPng(FAVICON_SVG, 32, 'favicon-32.png')
console.log('완료!')
