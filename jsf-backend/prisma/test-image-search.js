/** Quick test baidu/sogou image search */
async function testBaidu(keyword) {
  const qs = new URLSearchParams({
    tn: 'resultjson_com',
    ipn: 'rj',
    ct: '201326592',
    fp: 'result',
    word: keyword,
    queryWord: keyword,
    pn: '0',
    rn: '3'
  })
  const url = `https://image.baidu.com/search/acjson?${qs}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(keyword)}`
    }
  })
  const text = await res.text()
  const data = JSON.parse(text.replace(/[\x00-\x1f]/g, ''))
  const item = (data.data || []).find((x) => x && x.thumbURL)
  return item?.thumbURL || item?.middleURL || null
}

async function testSogou(keyword) {
  const url = `https://pic.sogou.com/napi/pc/searchList?mode=1&start=0&xml_len=48&query=${encodeURIComponent(keyword)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://pic.sogou.com/'
    }
  })
  const data = await res.json()
  const item = data?.data?.items?.[0]
  return item?.picUrl || item?.thumbUrl || null
}

async function main() {
  for (const kw of ['可口可乐 330ml', '百事可乐 600ml', '农夫山泉 550ml']) {
    const b = await testBaidu(kw).catch((e) => `ERR:${e.message}`)
    const s = await testSogou(kw).catch((e) => `ERR:${e.message}`)
    console.log(kw)
    console.log('  baidu:', b)
    console.log('  sogou:', s)
  }
}

main()
