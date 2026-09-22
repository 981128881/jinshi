const { toStoredPath } = require('./publicUrl')

/**
 * 资质图等「上传后锁死」字段：门店账号仅允许首次写入；平台管理员可改/删。
 * @returns {string|undefined} 要写入的存储路径；undefined=跳过该字段
 */
function resolveLockedImageUpdate(currentStored, incoming, { isPlatformAdmin, label }) {
  if (incoming === undefined) return undefined
  const next = toStoredPath(incoming == null ? '' : String(incoming))
  const cur = toStoredPath(currentStored || '')
  if (isPlatformAdmin) return next
  if (!cur) return next
  if (next === cur) return undefined
  const err = new Error(`${label}已上传，仅平台管理员可删除或重新上传`)
  err.statusCode = 403
  throw err
}

module.exports = { resolveLockedImageUpdate }

if (require.main === module) {
  const assert = require('assert')
  assert.strictEqual(resolveLockedImageUpdate('', '/a.jpg', { isPlatformAdmin: false, label: '执照' }), '/a.jpg')
  assert.strictEqual(resolveLockedImageUpdate('/a.jpg', undefined, { isPlatformAdmin: false, label: '执照' }), undefined)
  assert.strictEqual(resolveLockedImageUpdate('/a.jpg', '/a.jpg', { isPlatformAdmin: false, label: '执照' }), undefined)
  assert.strictEqual(resolveLockedImageUpdate('/a.jpg', '', { isPlatformAdmin: true, label: '执照' }), '')
  assert.strictEqual(resolveLockedImageUpdate('/a.jpg', '/b.jpg', { isPlatformAdmin: true, label: '执照' }), '/b.jpg')
  try {
    resolveLockedImageUpdate('/a.jpg', '/b.jpg', { isPlatformAdmin: false, label: '营业执照' })
    assert.fail('expected throw')
  } catch (e) {
    assert.equal(e.statusCode, 403)
  }
  console.log('ok')
}
