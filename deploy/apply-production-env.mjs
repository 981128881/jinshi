#!/usr/bin/env node
/**
 * 将 deploy/production.env 中的域名写入各项目正式环境配置
 *
 * 用法:
 *   node deploy/apply-production-env.mjs --domain=shop.example.com
 *   node deploy/apply-production-env.mjs --domain=shop.example.com --jwt=xxx --db-pass=xxx --admin-pass=xxx
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

function parseArgs(argv) {
  const out = {}
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

function loadTemplate() {
  const file = path.join(__dirname, 'production.env')
  return fs.readFileSync(file, 'utf8')
}

function applyDomain(text, domain) {
  return text.replace(/your-domain\.com/g, domain)
}

function writeIfChanged(filePath, content) {
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
  if (prev === content) {
    console.log(`  跳过(无变化): ${path.relative(ROOT, filePath)}`)
    return
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`  已写入: ${path.relative(ROOT, filePath)}`)
}

function parseEnv(text) {
  const map = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    map[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return map
}

function pickBackendEnv(envText) {
  const keys = [
    'PORT', 'NODE_ENV', 'PUBLIC_BASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN',
    'DATABASE_URL', 'REDIS_URL', 'REQUEST_TIMEOUT_MS', 'LOG_DIR', 'LOG_LEVEL',
    'LOG_TO_CONSOLE', 'LOG_MAX_FILE_MB', 'DB_LOG_QUERY', 'DB_SLOW_QUERY_MS',
    'REDIS_LOG_CACHE', 'CLIENT_LOG_ENABLED', 'ADMIN_USERNAME', 'ADMIN_PASSWORD',
    'ADMIN_ACCESS_EXPIRES_IN', 'ADMIN_REFRESH_EXPIRES_IN', 'POS_SYNC_TOKEN',
    'WX_APPID', 'WX_SECRET', 'WX_MCH_ID', 'WX_API_V3_KEY',
    'WX_CERT_SERIAL_NO', 'WX_PRIVATE_KEY_PATH', 'WX_MERCHANT_CERT_PATH',
    'WX_PAY_NOTIFY_URL', 'WX_PAY_MOCK', 'ORDER_PAY_TIMEOUT_MINUTES',
    'APIZERO_API_KEY', 'JISU_API_KEY', 'TENCENT_MAP_KEY',
    'POS_IMAGE_DIR', 'POS_EXPORT_JSON'
  ]
  const map = parseEnv(envText)
  return keys
    .filter((k) => map[k] !== undefined)
    .map((k) => `${k}=${map[k]}`)
    .join('\n') + '\n'
}

function pickAdminEnv(envText) {
  const keys = [
    'VITE_API_BASE', 'VITE_FILE_BASE', 'VITE_API_TIMEOUT', 'VITE_USE_MOCK',
    'VITE_LOG_LEVEL', 'VITE_LOG_CONSOLE', 'VITE_LOG_REPORT', 'VITE_LOG_REPORT_INTERVAL'
  ]
  const map = parseEnv(envText)
  return keys
    .filter((k) => map[k] !== undefined)
    .map((k) => `${k}=${map[k]}`)
    .join('\n') + '\n'
}

function pickFrontendEnv(envText) {
  const map = parseEnv(envText)
  return `VITE_API_BASE=${map.VITE_API_BASE || ''}\n`
}

function patchFrontendConfig(apiBase) {
  const file = path.join(ROOT, 'jsf-frontend/config/index.js')
  let src = fs.readFileSync(file, 'utf8')
  src = src.replace(
    /baseUrl: 'https:\/\/api\.[^']+\/api'/,
    `baseUrl: '${apiBase}'`
  )
  writeIfChanged(file, src)
}

function patchPosSyncProduction(envText, domain) {
  const map = parseEnv(envText)
  const token = map.POS_SYNC_TOKEN || 'change-me-pos-sync-token'
  const yaml = `# 生产环境 POS 同步（由 deploy/apply-production-env.mjs 生成）
# 复制为 config.local.yaml 或在 POS 机器上单独维护

pos:
  db_path: "G:/supermarket/AiBaoPOS/ABPOSYun/AppData/POS.db"
  password: "ab29176759ff"
  export_dir: "G:/supermarket/AiBaoPOS/export"

api:
  base_url: "https://api.${domain}"
  token: "${token}"
  timeout_sec: 120
  batch_size: 25
  endpoints:
    categories: "/api/sync/categories"
    brands: "/api/sync/brands"
    products: "/api/sync/products"
    stock: "/api/sync/stock"

sync:
  mode: "full"
  interval_minutes: 30
  online_only: false
  state_file: "G:/supermarket/AiBaoPOS/sync/.sync_state.json"

logging:
  file: "G:/supermarket/AiBaoPOS/sync/sync.log"
  level: "INFO"
`
  writeIfChanged(path.join(ROOT, 'AiBaoPOS/sync/config.production.yaml'), yaml)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const domain = args.domain || args.d
  if (!domain) {
    console.error('请指定备案域名: node deploy/apply-production-env.mjs --domain=shop.example.com')
    process.exit(1)
  }

  let template = loadTemplate()
  template = applyDomain(template, domain)

  if (args.jwt) template = template.replace(/JWT_SECRET=.*/, `JWT_SECRET=${args.jwt}`)
  if (args['db-pass']) {
    template = template.replace(
      /DATABASE_URL=mysql:\/\/wxapp:[^@]+@/,
      `DATABASE_URL=mysql://wxapp:${args['db-pass']}@`
    )
  }
  if (args['admin-pass']) {
    template = template.replace(/ADMIN_PASSWORD=.*/, `ADMIN_PASSWORD=${args['admin-pass']}`)
  }
  if (args['pos-token']) {
    template = template.replace(/POS_SYNC_TOKEN=.*/, `POS_SYNC_TOKEN=${args['pos-token']}`)
  }

  const map = parseEnv(template)
  const apiBase = map.VITE_API_BASE || `https://api.${domain}/api`

  console.log(`\n应用生产环境域名: ${domain}\n`)

  writeIfChanged(path.join(ROOT, 'deploy/production.env'), template)
  writeIfChanged(path.join(ROOT, 'jsf-backend/.env.production'), pickBackendEnv(template))
  writeIfChanged(path.join(ROOT, 'jsf-admin/.env.production'), pickAdminEnv(template))
  writeIfChanged(path.join(ROOT, 'jsf-frontend/.env.production'), pickFrontendEnv(template))

  patchFrontendConfig(apiBase)
  patchPosSyncProduction(template, domain)

  console.log('\n完成。下一步:')
  console.log('  1. 检查 deploy/production.env 中的 CHANGE_ME 项')
  console.log('  2. 服务器上: 在 jsf-backend/.env 增加 PUBLIC_BASE_URL=https://api.' + domain)
  console.log('  3. 管理后台: cd jsf-admin && npm run build')
  console.log('  4. 小程序: cd jsf-frontend && npm run build:mp-weixin')
  console.log('  5. 微信后台配置 request 合法域名: api.' + domain)
}

main()
