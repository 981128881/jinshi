const crypto = require('crypto')
const prisma = require('../db/prisma')

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode() {
  let s = 'M'
  for (let i = 0; i < 7; i++) s += CHARS[crypto.randomInt(CHARS.length)]
  return s
}

async function allocRestaurantCode(client = prisma) {
  for (let i = 0; i < 8; i++) {
    const code = randomCode()
    const exists = await client.restaurant.findUnique({ where: { code }, select: { id: true } })
    if (!exists) return code
  }
  return `M${Date.now().toString(36).toUpperCase()}`
}

async function backfillRestaurantCodes() {
  const rows = await prisma.restaurant.findMany({
    where: { OR: [{ code: null }, { code: '' }] },
    select: { id: true }
  })
  for (const row of rows) {
    await prisma.restaurant.update({
      where: { id: row.id },
      data: { code: await allocRestaurantCode() }
    })
  }
  return rows.length
}

module.exports = { randomCode, allocRestaurantCode, backfillRestaurantCodes }

if (require.main === module) {
  const code = randomCode()
  if (!/^M[A-Z2-9]{7}$/.test(code)) {
    console.error('bad code', code)
    process.exit(1)
  }
  console.log('ok', code)
}
