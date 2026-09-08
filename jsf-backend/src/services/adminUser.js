const prisma = require('../db/prisma')
const config = require('../config')
const { hashPassword, verifyPassword } = require('../utils/password')
const {
  getEffectivePermissions,
  normalizePermissions,
  ALL_PERMISSION_CODES
} = require('../constants/adminPermissions')

function formatAdminUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname || row.username,
    enabled: row.enabled,
    isSuper: row.isSuper,
    permissions: getEffectivePermissions(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

async function ensureDefaultAdmin() {
  const existing = await prisma.adminUser.findFirst()
  if (existing) return existing

  return prisma.adminUser.create({
    data: {
      username: config.admin.username,
      password: hashPassword(config.admin.password),
      nickname: '超级管理员',
      enabled: true,
      isSuper: true,
      permissions: ALL_PERMISSION_CODES
    }
  })
}

async function findAdminByUsername(username) {
  if (!username) return null
  return prisma.adminUser.findUnique({ where: { username } })
}

async function authenticateAdmin(username, password) {
  let user = await findAdminByUsername(username)

  if (!user) {
    const count = await prisma.adminUser.count()
    if (
      count === 0 &&
      username === config.admin.username &&
      password === config.admin.password
    ) {
      user = await ensureDefaultAdmin()
      return user
    }
    return null
  }

  if (!user.enabled) return null
  if (!verifyPassword(password, user.password)) return null
  return user
}

async function getAdminProfile(username) {
  const user = await findAdminByUsername(username)
  if (!user || !user.enabled) return null
  return formatAdminUser(user)
}

async function listAdminUsers() {
  const rows = await prisma.adminUser.findMany({ orderBy: { id: 'asc' } })
  return rows.map(formatAdminUser)
}

async function createAdminUser({ username, password, nickname, enabled = true, isSuper = false, permissions = [] }) {
  const exists = await prisma.adminUser.findUnique({ where: { username } })
  if (exists) {
    const err = new Error('用户名已存在')
    err.statusCode = 400
    throw err
  }
  if (!password || String(password).length < 6) {
    const err = new Error('密码至少 6 位')
    err.statusCode = 400
    throw err
  }

  const row = await prisma.adminUser.create({
    data: {
      username,
      password: hashPassword(password),
      nickname: nickname || username,
      enabled: enabled !== false,
      isSuper: !!isSuper,
      permissions: isSuper ? ALL_PERMISSION_CODES : normalizePermissions(permissions)
    }
  })
  return formatAdminUser(row)
}

async function updateAdminUser(id, { password, nickname, enabled, isSuper, permissions }, operator) {
  const existing = await prisma.adminUser.findUnique({ where: { id } })
  if (!existing) {
    const err = new Error('管理员不存在')
    err.statusCode = 404
    throw err
  }

  if (existing.isSuper && operator?.id !== existing.id && isSuper === false) {
    const err = new Error('不能取消超级管理员的超级权限')
    err.statusCode = 400
    throw err
  }

  const superCount = await prisma.adminUser.count({ where: { isSuper: true } })
  if (existing.isSuper && superCount <= 1 && enabled === false) {
    const err = new Error('至少保留一个可用的超级管理员')
    err.statusCode = 400
    throw err
  }

  const data = {}
  if (nickname != null) data.nickname = nickname
  if (enabled != null) data.enabled = !!enabled
  if (isSuper != null) {
    data.isSuper = !!isSuper
    if (data.isSuper) data.permissions = ALL_PERMISSION_CODES
  }
  if (permissions != null && !data.isSuper) {
    data.permissions = normalizePermissions(permissions)
  }
  if (password) {
    if (String(password).length < 6) {
      const err = new Error('密码至少 6 位')
      err.statusCode = 400
      throw err
    }
    data.password = hashPassword(password)
  }

  const row = await prisma.adminUser.update({ where: { id }, data })
  return formatAdminUser(row)
}

async function deleteAdminUser(id, operator) {
  const existing = await prisma.adminUser.findUnique({ where: { id } })
  if (!existing) {
    const err = new Error('管理员不存在')
    err.statusCode = 404
    throw err
  }
  if (operator?.id === id) {
    const err = new Error('不能删除当前登录账号')
    err.statusCode = 400
    throw err
  }
  if (existing.isSuper) {
    const superCount = await prisma.adminUser.count({ where: { isSuper: true } })
    if (superCount <= 1) {
      const err = new Error('至少保留一个超级管理员')
      err.statusCode = 400
      throw err
    }
  }

  await prisma.adminUser.delete({ where: { id } })
  return { id }
}

module.exports = {
  formatAdminUser,
  ensureDefaultAdmin,
  authenticateAdmin,
  getAdminProfile,
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
}
