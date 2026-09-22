const http = require('http')

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = 'Bearer ' + token
    if (data) headers['Content-Length'] = Buffer.byteLength(data)
    const r = http.request(
      { hostname: '127.0.0.1', port: 3000, path, method, headers },
      (res) => {
        let b = ''
        res.on('data', (c) => (b += c))
        res.on('end', () => resolve({ status: res.statusCode, body: b }))
      }
    )
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

;(async () => {
  const h = await req('GET', '/health')
  console.log('health', h.status, h.body)
  const login = await req('POST', '/api/admin/login', { username: 'admin', password: 'admin123' })
  console.log('login', login.status, login.body.slice(0, 300))
  const j = JSON.parse(login.body)
  const token = j.data && (j.data.accessToken || j.data.token)
  const ap = await req('POST', '/api/admin/onboarding/7/approve', {}, token)
  console.log('approve', ap.status, ap.body)
})().catch((e) => console.error(e))
