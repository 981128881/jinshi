const fs = require('fs')
const path = require('path')

const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs')
const date = new Date().toISOString().slice(0, 10)
const type = process.argv[2] || 'app'
const file = path.join(logDir, `${type}-${date}.log`)

if (!fs.existsSync(file)) {
  console.log(`日志文件不存在: ${file}`)
  console.log('类型: app | error | access | client')
  console.log('请先启动服务: npm run dev')
  process.exit(1)
}

console.log(`--- ${file} ---\n`)
console.log(fs.readFileSync(file, 'utf8'))
