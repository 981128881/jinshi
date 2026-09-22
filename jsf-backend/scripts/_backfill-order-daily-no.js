/**
 * 为历史预约单回填门店当日序号（上海自然日）。
 * 用法：node scripts/_backfill-order-daily-no.js
 */
const prisma = require('../src/db/prisma')
const { shanghaiDateKey } = require('../src/utils/orderDailyNo')

async function main() {
  const orders = await prisma.order.findMany({
    where: { OR: [{ dailyNo: 0 }, { dailyDate: '' }] },
    select: { id: true, restaurantId: true, createdAt: true },
    orderBy: [{ restaurantId: 'asc' }, { createdAt: 'asc' }]
  })
  const counters = new Map() // `${rid}|${date}` -> next no
  let n = 0
  for (const o of orders) {
    const dailyDate = shanghaiDateKey(o.createdAt)
    const key = `${o.restaurantId}|${dailyDate}`
    const dailyNo = (counters.get(key) || 0) + 1
    counters.set(key, dailyNo)
    await prisma.order.update({
      where: { id: o.id },
      data: { dailyDate, dailyNo }
    })
    n += 1
  }
  console.log(`backfilled ${n} orders`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
