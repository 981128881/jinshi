/**
 * 清空所有商品（保留分类、订单历史）
 * 用法: node prisma/clear-all-products.js
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const before = await prisma.product.count()
  console.log(`当前商品数: ${before}`)

  const cart = await prisma.cartItem.deleteMany()
  console.log(`已清空购物车项: ${cart.count}`)

  const orderItems = await prisma.orderItem.updateMany({
    data: { productId: null }
  })
  console.log(`已解除订单明细商品关联: ${orderItems.count}`)

  const products = await prisma.product.deleteMany()
  console.log(`已删除商品: ${products.count}`)

  const after = await prisma.product.count()
  console.log(`剩余商品数: ${after}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
