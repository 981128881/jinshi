const prisma = require('../db/prisma')
const { ORDER_STATUS } = require('../constants/order')

/** 与小程序订单列表 Tab 筛选规则保持一致 */
async function getUserOrderCounts(userId) {
	const base = { userId }
	const [unpaid, unshipped, completed] = await Promise.all([
		prisma.order.count({ where: { ...base, status: ORDER_STATUS.UNPAID } }),
		prisma.order.count({ where: { ...base, status: ORDER_STATUS.PAID } }),
		prisma.order.count({
			where: { ...base, status: { in: [ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED] } }
		})
	])
	return { unpaid, unshipped, completed }
}

module.exports = { getUserOrderCounts }
