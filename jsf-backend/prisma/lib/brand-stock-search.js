/**
 * 多源搜品牌商品图 + 本地占位图生成
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const BRAND_COLORS = {
  可口可乐: '#E60012',
  百事: '#004B93',
  百事可乐: '#004B93',
  雪碧: '#009639',
  芬达: '#F58025',
  美年达: '#FF6600',
  七喜: '#00A651',
  农夫山泉: '#E60012',
  怡宝: '#00A0E9',
  娃哈哈: '#E60012',
  康师傅: '#E60012',
  统一: '#E60012',
  蒙牛: '#006633',
  伊利: '#0066B3',
  红牛: '#003DA5',
  元气森林: '#000000'
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function normalizeUrl(url) {
  if (!url) return null
  let u = String(url).trim()
  if (u.startsWith('//')) u = `https:${u}`
  if (!u.startsWith('http')) return null
  return u
}

async function searchJdPc(keyword) {
  const url = `https://search.jd.com/Search?enc=utf-8&keyword=${encodeURIComponent(keyword)}&wq=${encodeURIComponent(keyword)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html', Referer: 'https://www.jd.com/' }
  })
  if (!res.ok) return null
  const html = await res.text()
  const patterns = [
    /data-lazy-img="(\/\/img\d+\.360buyimg\.com[^"]+)"/,
    /data-lazy-img="(https:\/\/img\d+\.360buyimg\.com[^"]+)"/,
    /"(https:\/\/img\d+\.360buyimg\.com\/n\d+\/jfs\/[^"]+\.(?:jpg|png|webp))"/i
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return normalizeUrl(m[1])
  }
  return null
}

async function searchJdMobile(keyword) {
  const url = `https://so.m.jd.com/ware/search.action?keyword=${encodeURIComponent(keyword)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      Accept: 'text/html',
      Referer: 'https://m.jd.com/'
    }
  })
  if (!res.ok) return null
  const html = await res.text()
  const patterns = [
    /"(https:\/\/img\d+\.360buyimg\.com\/[^"]+\.(?:jpg|png|webp))"/i,
    /src="(\/\/img\d+\.360buyimg\.com[^"]+)"/
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return normalizeUrl(m[1])
  }
  return null
}

async function searchSogou(keyword) {
  const url = `https://pic.sogou.com/napi/pc/searchList?mode=1&start=0&xml_len=48&query=${encodeURIComponent(keyword)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: 'https://pic.sogou.com/' }
  })
  if (!res.ok) return null
  const data = await res.json()
  const items = data?.data?.items || []
  for (const item of items) {
    const u = normalizeUrl(item.picUrl || item.thumbUrl || item.locImageLink)
    if (u) return u
  }
  return null
}

async function searchBaidu(keyword) {
  const qs = new URLSearchParams({
    tn: 'resultjson_com',
    ipn: 'rj',
    word: keyword,
    queryWord: keyword,
    pn: '0',
    rn: '8'
  })
  const url = `https://image.baidu.com/search/acjson?${qs}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Referer: `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(keyword)}`
    }
  })
  if (!res.ok) return null
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text.replace(/[\x00-\x1f]/g, ''))
  } catch {
    return null
  }
  for (const item of data.data || []) {
    if (!item || item.type === 'baidu') continue
    const u = normalizeUrl(item.thumbURL || item.middleURL || item.hoverURL || item.objURL)
    if (u) return u
  }
  return null
}

const SEARCHERS = [
  { name: 'sogou', fn: searchSogou },
  { name: 'baidu', fn: searchBaidu },
  { name: 'jd-mobile', fn: searchJdMobile },
  { name: 'jd-pc', fn: searchJdPc }
]

async function findBrandImageUrl(keyword) {
  const queries = [keyword, `${keyword} 商品`, `${keyword} 饮料`, `${keyword} 瓶装`]
  for (const q of queries) {
    for (const { name, fn } of SEARCHERS) {
      try {
        const url = await fn(q)
        if (url) return { url, source: name, query: q }
      } catch {
        // next
      }
      await sleep(250)
    }
  }
  return null
}

/** 搜白底商品主图（电商主图风格） */
async function findWhiteBgImageUrl(productName) {
  const base = String(productName || '').replace(/\s+/g, ' ').trim().slice(0, 40)
  if (!base) return null
  const queries = [
    `${base} 白底`,
    `${base} 白底图`,
    `${base} 白背景 商品`,
    `${base} 商品主图 白底`,
    `${base} 电商主图`,
    `${base} 商品`
  ]
  for (const q of queries) {
    for (const { name, fn } of SEARCHERS) {
      try {
        const url = await fn(q)
        if (url) {
          let pic = url.replace(/\/n\d+\//, '/n1/')
          return { url: pic, source: `${name}-white`, query: q }
        }
      } catch {
        // next
      }
      await sleep(280)
    }
  }
  return null
}

/** 下载后统一铺白底、居中，输出 JPG */
async function applyWhiteBackground(inputPath, outputPath) {
  await sharp(inputPath, { failOn: 'none' })
    .rotate()
    .resize(1200, 1200, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outputPath)
  return true
}

async function downloadImage(picUrl, destPath, referer = 'https://www.jd.com/', retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(picUrl, {
        headers: { 'User-Agent': UA, Referer: referer },
        signal: AbortSignal.timeout(30000)
      })
      if (!res.ok) return false
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 800) return false
      fs.writeFileSync(destPath, buf)
      return true
    } catch (err) {
      if (attempt === retries) throw err
      await sleep(1000 * attempt)
    }
  }
  return false
}

async function generatePlaceholder(keyword, destPath) {
  const color = BRAND_COLORS[keyword] || '#5B6C7D'
  const lines = keyword.length > 4 ? [keyword.slice(0, 4), keyword.slice(4)] : [keyword]
  const textSvg = lines
    .map((line, i) => {
      const y = lines.length === 1 ? 210 : 190 + i * 44
      return `<text x="200" y="${y}" font-size="34" fill="#ffffff" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-weight="600">${line}</text>`
    })
    .join('')
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" rx="24" fill="${color}"/>
  ${textSvg}
  <text x="200" y="320" font-size="18" fill="rgba(255,255,255,0.85)" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">品牌商品</text>
</svg>`
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(destPath)
  return true
}

module.exports = {
  findBrandImageUrl,
  findWhiteBgImageUrl,
  downloadImage,
  generatePlaceholder,
  applyWhiteBackground,
  SEARCHERS
}
