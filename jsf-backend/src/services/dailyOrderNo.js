/** 业务日：每天凌晨 2 点（北京时间）切换，此前算前一天 */
function getBusinessDayKey(now = new Date()) {
  const cn = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  if (cn.getHours() < 2) {
    cn.setDate(cn.getDate() - 1)
  }
  const y = cn.getFullYear()
  const m = String(cn.getMonth() + 1).padStart(2, '0')
  const d = String(cn.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 在事务内分配当日递增编号（1, 2, 3…） */
async function allocateDailyOrderNo(tx, paidAt = new Date()) {
  const businessDay = getBusinessDayKey(paidAt)

  if (tx.dailyOrderCounter?.upsert) {
    const row = await tx.dailyOrderCounter.upsert({
      where: { businessDay },
      create: { businessDay, lastNo: 1 },
      update: { lastNo: { increment: 1 } }
    })
    return { dailyNo: row.lastNo, businessDay }
  }

  const maxRow = await tx.order.findFirst({
    where: { businessDay, dailyNo: { not: null } },
    orderBy: { dailyNo: 'desc' },
    select: { dailyNo: true }
  })
  return { dailyNo: (maxRow?.dailyNo || 0) + 1, businessDay }
}

module.exports = { getBusinessDayKey, allocateDailyOrderNo }

if (require.main === module) {
  const assert = require('assert')
  const early = new Date('2026-07-04T17:30:00.000Z')
  assert.strictEqual(getBusinessDayKey(early), '2026-07-04')
  const late = new Date('2026-07-04T19:00:00.000Z')
  assert.strictEqual(getBusinessDayKey(late), '2026-07-05')
  console.log('dailyOrderNo ok')
}
