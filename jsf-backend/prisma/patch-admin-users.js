const { PrismaClient } = require('@prisma/client')
const config = require('../src/config')
const { hashPassword } = require('../src/utils/password')
const { ALL_PERMISSION_CODES } = require('../src/constants/adminPermissions')

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.adminUser.findFirst()
  if (existing) {
    console.log('AdminUser 已存在，跳过')
    return
  }

  await prisma.adminUser.create({
    data: {
      username: config.admin.username,
      password: hashPassword(config.admin.password),
      nickname: '超级管理员',
      enabled: true,
      isSuper: true,
      permissions: ALL_PERMISSION_CODES
    }
  })
  console.log(`已创建超级管理员: ${config.admin.username}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
