/**
 * 种子店/菜占位图（PNG，微信 <image> 不认 SVG）
 * node scripts/gen-demo-assets.js
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const PUBLIC = path.join(__dirname, '../public')
const FRONT_DEMO = path.join(__dirname, '../../jsf-frontend/static/shop/demo-1.png')

const shops = [
  { file: 'shop/shop-1.png', color: '#F97316' },
  { file: 'shop/shop-2.png', color: '#22C55E' },
  { file: 'shop/shop-3.png', color: '#78716C' },
  { file: 'shop/shop-4.png', color: '#F59E0B' },
  { file: 'shop/shop-5.png', color: '#38BDF8' },
  { file: 'shop/shop-6.png', color: '#F472B6' }
]

const dishes = [
  { file: 'dish/d01.png', color: '#EF4444' },
  { file: 'dish/d02.png', color: '#F97316' },
  { file: 'dish/d03.png', color: '#84CC16' },
  { file: 'dish/d04.png', color: '#22C55E' },
  { file: 'dish/d05.png', color: '#14B8A6' },
  { file: 'dish/d06.png', color: '#0EA5E9' },
  { file: 'dish/d07.png', color: '#8B5CF6' },
  { file: 'dish/d08.png', color: '#EC4899' },
  { file: 'dish/d09.png', color: '#F59E0B' },
  { file: 'dish/d10.png', color: '#64748B' },
  { file: 'dish/d11.png', color: '#A78BFA' },
  { file: 'dish/d12.png', color: '#2DD4BF' }
]

async function writePng(rel, color) {
  const abs = path.join(PUBLIC, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  await sharp({
    create: { width: 400, height: 400, channels: 3, background: color }
  })
    .png()
    .toFile(abs)
  if (!fs.existsSync(abs) || fs.statSync(abs).size < 100) {
    throw new Error('placeholder too small: ' + rel)
  }
  console.log('wrote', rel)
}

async function main() {
  for (const s of shops) await writePng(s.file, s.color)
  for (const d of dishes) await writePng(d.file, d.color)
  fs.mkdirSync(path.dirname(FRONT_DEMO), { recursive: true })
  fs.copyFileSync(path.join(PUBLIC, 'shop/shop-1.png'), FRONT_DEMO)
  console.log('ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
