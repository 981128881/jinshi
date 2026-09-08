import config from '@/config'

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {() => Promise<T>} mockFn
 */
export function useMockApi(fn, mockFn) {
  if (config.useMock) return mockFn()
  return fn()
}

/** @param {number} [ms=300] */
export function mockDelay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
