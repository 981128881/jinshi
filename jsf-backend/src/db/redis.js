const Redis = require('ioredis')
const config = require('../config')
const { createLogger } = require('../utils/logger')

const log = createLogger('redis')

const logCache = process.env.REDIS_LOG_CACHE === 'true'

let client = null
/** @type {import('ioredis').Redis | null} */
let subscriber = null
let available = false

function getRedis() {
  if (client) return client
  client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000))
  })
  client.on('error', (err) => {
    available = false
    log.warn('Redis 连接异常', err)
  })
  client.on('ready', () => {
    available = true
    log.info('Redis 已就绪')
  })
  client.on('connect', () => {
    log.info('Redis 已连接')
  })
  return client
}

function getRedisSubscriber() {
  if (subscriber) return subscriber
  subscriber = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000))
  })
  subscriber.on('error', (err) => {
    log.warn('Redis 订阅连接异常', err)
  })
  subscriber.on('ready', () => {
    log.info('Redis 订阅通道已就绪')
  })
  return subscriber
}

async function connectRedis() {
  getRedis()
  await new Promise((resolve) => setTimeout(resolve, 500))
  available = client?.status === 'ready'
  if (!available) {
    log.warn('Redis 未连接，将直接读数据库')
  }
}

function isRedisReady() {
  return available && client && client.status === 'ready'
}

async function cacheGet(key) {
  if (!isRedisReady()) return null
  try {
    const val = await client.get(key)
    if (logCache) {
      log.debug(val ? 'cache hit' : 'cache miss', { key })
    }
    return val ? JSON.parse(val) : null
  } catch (e) {
    log.warn('cacheGet 失败', { key, error: e.message })
    return null
  }
}

async function cacheSet(key, data, ttlSeconds = 300) {
  if (!isRedisReady()) return
  try {
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds)
    if (logCache) log.debug('cache set', { key, ttlSeconds })
  } catch (e) {
    log.warn('cacheSet 失败', { key, error: e.message })
  }
}

async function cacheDel(...keys) {
  if (!isRedisReady() || !keys.length) return
  try {
    await client.del(...keys)
    if (logCache) log.debug('cache del', { keys })
  } catch (e) {
    log.warn('cacheDel 失败', { keys, error: e.message })
  }
}

async function getOrSet(key, ttlSeconds, fetchFn) {
  const cached = await cacheGet(key)
  if (cached !== null) return cached
  const data = await fetchFn()
  await cacheSet(key, data, ttlSeconds)
  return data
}

/** 分布式锁，Redis 不可用时降级为无锁（单机开发） */
async function acquireLock(key, ttlSeconds = 30) {
  if (!isRedisReady()) return true
  try {
    const result = await client.set(key, '1', 'EX', ttlSeconds, 'NX')
    const ok = result === 'OK'
    if (logCache) log.debug(ok ? 'lock acquired' : 'lock busy', { key })
    return ok
  } catch (e) {
    log.warn('acquireLock 失败', { key, error: e.message })
    return false
  }
}

async function releaseLock(key) {
  if (!isRedisReady()) return
  try {
    await client.del(key)
    if (logCache) log.debug('lock released', { key })
  } catch (e) {
    log.warn('releaseLock 失败', { key, error: e.message })
  }
}

const CACHE_KEYS = {
  SHOP_CONFIG: 'cache:shop:config',
  HOT_KEYWORDS: 'cache:search:hot-keywords',
  BANNERS: 'cache:home:banners',
  CATEGORIES: 'cache:categories:list',
  CUISINE_TYPES: 'cache:cuisine-types:list',
  geocode: (lat, lng) => `cache:geocode:${lat},${lng}`,
  searchResult: (keyword, page, pageSize) =>
    `cache:search:${encodeURIComponent(keyword)}:${page}:${pageSize}`
}

module.exports = {
  connectRedis,
  isRedisReady,
  getRedis,
  getRedisSubscriber,
  cacheGet,
  cacheSet,
  cacheDel,
  getOrSet,
  acquireLock,
  releaseLock,
  CACHE_KEYS
}
