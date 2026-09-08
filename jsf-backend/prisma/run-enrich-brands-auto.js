/**
 * 自动分批补大牌主图，可重复运行（跳过已有图）
 *
 * 用法:
 *   node prisma/run-enrich-brands-auto.js
 *   node prisma/run-enrich-brands-auto.js --batch=50 --max-rounds=10
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const LOG = 'G:/supermarket/AiBaoPOS/sync/brand_enrich_auto.log'
const NODE = process.execPath

function parseArgs(argv) {
  const num = (prefix, fallback) => {
    const arg = argv.find((a) => a.startsWith(`${prefix}=`))
    return arg ? Number(arg.split('=')[1]) : fallback
  }
  return {
    batch: num('--batch', 80),
    maxRounds: num('--max-rounds', 30),
    skipDownload: argv.includes('--skip-download')
  }
}

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`
  fs.mkdirSync(path.dirname(LOG), { recursive: true })
  fs.appendFileSync(LOG, msg + '\n', 'utf8')
  console.log(msg)
}

function runNode(args) {
  const r = spawnSync(NODE, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: process.env,
    timeout: 30 * 60 * 1000
  })
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim()
  if (r.status !== 0) log(`ERROR exit=${r.status} args=${args.join(' ')}\n${out.slice(-3000)}`)
  return { status: r.status, out }
}

function parseSaved(out) {
  const m = out.match(/--- 完成 ---[\s\S]*?(\{[\s\S]*?\})/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  log(`===== auto enrich start batch=${opts.batch} maxRounds=${opts.maxRounds} =====`)

  if (!opts.skipDownload) {
    log('--- download brand stock images ---')
    const dl = runNode(['prisma/download-brand-stock.js'])
    log(dl.out.split('\n').slice(-15).join('\n'))
  }

  log('--- initial list ---')
  const list0 = runNode(['prisma/enrich-brand-images.js', '--list'])
  log(list0.out.split('\n').filter((l) => l.includes('匹配') || l.includes('noImage')).join('\n'))

  const tiers = [1, 2, 3, null]
  let totalSaved = 0

  for (const tier of tiers) {
    const label = tier == null ? 'all' : `tier${tier}`
    log(`=== phase ${label} ===`)

    for (let round = 1; round <= opts.maxRounds; round++) {
      const args = [
        'prisma/enrich-brand-images.js',
        `--limit=${opts.batch}`,
        '--with-search'
      ]
      if (tier != null) args.push(`--tier=${tier}`)

      log(`round ${round} ${label}`)
      const r = runNode(args)
      const stats = parseSaved(r.out)
      const saved = stats?.saved ?? 0
      totalSaved += saved
      log(`saved=${saved} skip=${stats?.skip ?? '?'} bySource=${JSON.stringify(stats?.bySource || {})}`)

      if (saved === 0) break
    }
  }

  log('--- final list ---')
  const list1 = runNode(['prisma/enrich-brand-images.js', '--list'])
  log(list1.out.split('\n').filter((l) => l.includes('匹配') || l.includes('noImage') || l.includes('tier=')).slice(-20).join('\n'))
  log(`===== auto enrich end totalSaved=${totalSaved} =====`)
}

main().catch((e) => {
  log(`FATAL ${e.stack || e.message}`)
  process.exit(1)
})
