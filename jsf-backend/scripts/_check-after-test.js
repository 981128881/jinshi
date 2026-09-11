const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const restaurants = await p.restaurant.findMany({
    select: { id: true, name: true, status: true, open: true }
  })
  const leftoverCuisine = await p.cuisineType.findMany({
    where: { OR: [{ name: { contains: '__test' } }, { name: { contains: 'script' } }] },
    select: { id: true, name: true }
  })
  const leftoverBanner = await p.banner.findMany({
    where: { title: { contains: '__test' } },
    select: { id: true, title: true }
  })
  console.log(JSON.stringify({ restaurants, leftoverCuisine, leftoverBanner }, null, 2))
  await p.$disconnect()
})()
