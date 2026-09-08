/**
 * 为 Order 表补充 remark 字段
 * 用法: node prisma/patch-order-remark.js
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
	await prisma.$executeRawUnsafe(
		'ALTER TABLE `Order` ADD COLUMN `remark` VARCHAR(256) NOT NULL DEFAULT ""'
	)
	console.log('Order.remark column added')
}

main()
	.catch((e) => {
		if (String(e.message || '').includes('Duplicate column')) {
			console.log('Order.remark already exists, skip')
			return
		}
		throw e
	})
	.finally(() => prisma.$disconnect())
