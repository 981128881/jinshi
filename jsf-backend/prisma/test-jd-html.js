/** Test JD HTML image extraction without Playwright */
async function testJd(keyword) {
  const url = `https://search.jd.com/Search?enc=utf-8&keyword=${encodeURIComponent(keyword)}&wq=${encodeURIComponent(keyword)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      Referer: 'https://www.jd.com/',
      Cookie: 'ipLoc-djd=1-72-55653-0; __jda=1.1; __jdv=1|direct|-|none|-|1'
    },
    redirect: 'follow'
  })
  const html = await res.text()
  const patterns = [
    /data-lazy-img="(https?:\/\/[^"]+)"/,
    /data-lazy-img="(\/\/[^"]+)"/,
    /src="(https:\/\/img\d+\.360buyimg\.com\/[^"]+)"/,
    /"(https:\/\/img\d+\.360buyimg\.com\/n7\/jfs\/[^"]+)"/
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return m[1].startsWith('//') ? `https:${m[1]}` : m[1]
  }
  return { status: res.status, len: html.length, sample: html.slice(0, 200) }
}

async function testDownload(url) {
  const res = await fetch(url.startsWith('//') ? `https:${url}` : url, {
    headers: { Referer: 'https://www.jd.com/', 'User-Agent': 'Mozilla/5.0' }
  })
  const buf = Buffer.from(await res.arrayBuffer())
  return { status: res.status, bytes: buf.length, type: res.headers.get('content-type') }
}

async function main() {
  for (const kw of ['可口可乐 330ml', '百事可乐', '农夫山泉']) {
    const img = await testJd(kw)
    console.log(kw, '=>', typeof img === 'string' ? img : JSON.stringify(img))
    if (typeof img === 'string') {
      console.log('  download:', await testDownload(img))
    }
  }
}

main().catch(console.error)
