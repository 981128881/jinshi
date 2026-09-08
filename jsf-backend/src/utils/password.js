const crypto = require('crypto')

const SALT_LEN = 16
const KEY_LEN = 64
const ITERATIONS = 100000

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex')
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LEN, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  if (!password || !stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const check = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LEN, 'sha512').toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'))
  } catch {
    return false
  }
}

module.exports = { hashPassword, verifyPassword }
