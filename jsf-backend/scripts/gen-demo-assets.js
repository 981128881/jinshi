/**
 * Generate placeholder shop/dish SVGs for demo seed.
 * Usage: node scripts/gen-demo-assets.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '../../wxapp-frontend/static')

const shops = [
  { file: 'shop/shop-1.svg', c1: '#F97316', c2: '#DC2626', label: 'HOT' },
  { file: 'shop/shop-2.svg', c1: '#22C55E', c2: '#15803D', label: 'HOME' },
  { file: 'shop/shop-3.svg', c1: '#78716C', c2: '#44403C', label: 'BBQ' },
  { file: 'shop/shop-4.svg', c1: '#F59E0B', c2: '#D97706', label: 'FAST' },
  { file: 'shop/shop-5.svg', c1: '#38BDF8', c2: '#0284C7', label: 'WEST' },
  { file: 'shop/shop-6.svg', c1: '#F472B6', c2: '#DB2777', label: 'SWEET' }
]

const dishes = [
  { file: 'dish/d01.svg', c1: '#EF4444', c2: '#B91C1C', label: '锅' },
  { file: 'dish/d02.svg', c1: '#F97316', c2: '#C2410C', label: '肉' },
  { file: 'dish/d03.svg', c1: '#84CC16', c2: '#4D7C0F', label: '蔬' },
  { file: 'dish/d04.svg', c1: '#22C55E', c2: '#15803D', label: '菜' },
  { file: 'dish/d05.svg', c1: '#14B8A6', c2: '#0F766E', label: '汤' },
  { file: 'dish/d06.svg', c1: '#0EA5E9', c2: '#0369A1', label: '饭' },
  { file: 'dish/d07.svg', c1: '#8B5CF6', c2: '#6D28D9', label: '烤' },
  { file: 'dish/d08.svg', c1: '#EC4899', c2: '#BE185D', label: '甜' },
  { file: 'dish/d09.svg', c1: '#F59E0B', c2: '#B45309', label: '炸' },
  { file: 'dish/d10.svg', c1: '#64748B', c2: '#334155', label: '面' },
  { file: 'dish/d11.svg', c1: '#A78BFA', c2: '#7C3AED', label: '萨' },
  { file: 'dish/d12.svg', c1: '#2DD4BF', c2: '#0D9488', label: '饮' }
]

function shopSvg({ c1, c2, label }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="36" fill="url(#g)"/>
  <circle cx="200" cy="155" r="72" fill="#ffffff" opacity="0.92"/>
  <path d="M118 248c22-42 142-42 164 0v48H118z" fill="#ffffff" opacity="0.88"/>
  <text x="200" y="345" text-anchor="middle" fill="#ffffff" font-size="40" font-family="Arial,sans-serif" font-weight="700">${label}</text>
</svg>
`
}

function dishSvg({ c1, c2, label }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="28" fill="url(#g)"/>
  <ellipse cx="200" cy="210" rx="110" ry="70" fill="#ffffff" opacity="0.25"/>
  <ellipse cx="200" cy="195" rx="78" ry="48" fill="#ffffff" opacity="0.85"/>
  <circle cx="200" cy="120" r="36" fill="#ffffff" opacity="0.9"/>
  <text x="200" y="340" text-anchor="middle" fill="#ffffff" font-size="48" font-family="Microsoft YaHei,sans-serif" font-weight="700">${label}</text>
</svg>
`
}

for (const s of shops) {
  const p = path.join(ROOT, s.file)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, shopSvg(s), 'utf8')
  console.log('wrote', s.file)
}
for (const d of dishes) {
  const p = path.join(ROOT, d.file)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, dishSvg(d), 'utf8')
  console.log('wrote', d.file)
}
console.log('done')
