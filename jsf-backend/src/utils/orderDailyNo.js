/** 上海自然日 YYYY-MM-DD */
function shanghaiDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
}

/**
 * 取门店当日下一个序号（事务内调用）。
 * ponytail: 靠 @@unique(restaurantId,dailyDate,dailyNo) 兜底并发；冲突由调用方重试。
 */
async function nextDailyNo(tx, restaurantId, now = new Date()) {
  const dailyDate = shanghaiDateKey(now)
  const agg = await tx.order.aggregate({
    where: { restaurantId: Number(restaurantId), dailyDate },
    _max: { dailyNo: true }
  })
  return { dailyDate, dailyNo: (agg._max.dailyNo || 0) + 1 }
}

module.exports = { shanghaiDateKey, nextDailyNo }

if (require.main === module) {
  const assert = require('assert')
  const key = shanghaiDateKey(new Date('2026-09-22T16:30:00Z')) // CST 00:30 next day
  assert.equal(key, '2026-09-23')
  assert.equal(shanghaiDateKey(new Date('2026-09-22T15:59:00Z')), '2026-09-22')
  console.log('ok')
}
