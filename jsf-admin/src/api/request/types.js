/**
 * @typedef {Object} AppConfig
 * @property {string} baseUrl
 * @property {number} timeout
 * @property {number[]} successCode
 * @property {boolean} useMock
 * @property {{ count: number, delay: number, retryOn: string[] }} retry
 * @property {{ defaultTtl: number }} cache
 * @property {{ enabled: boolean, slowThreshold: number }} observe
 * @property {string} tokenKey
 * @property {string} refreshTokenKey
 * @property {string} userKey
 */

/**
 * @typedef {Object} ApiEnvelope
 * @property {number} code
 * @property {string} [message]
 * @property {string} [msg]
 * @property {*} [data]
 */

/**
 * @typedef {Object} RequestOptions
 * @property {boolean} [loading=false] - 显示全局 Loading
 * @property {string} [loadingText='加载中...']
 * @property {boolean} [showError=true] - 失败时 Toast
 * @property {boolean} [requireAuth=true] - 携带 Bearer Token（勿用 auth，会与 axios 内置 Basic 认证冲突）
 * @property {boolean} [skipRefresh=false] - 401 时不尝试 refresh（用于 refresh 接口本身）
 * @property {string} [pageId] - 页面 ID，卸载时取消该页请求
 * @property {string} [cancelKey] - 取消键，新请求会 abort 同 key 旧请求
 * @property {boolean|string} [dedup=false] - true 或 key 时去重；'ignore' 返回进行中的 promise
 * @property {boolean|number|{ count?: number, delay?: number }} [retry=false]
 * @property {boolean|number} [cache=false] - GET 缓存，number 为 TTL(ms)
 * @property {import('axios').AxiosRequestConfig} [axiosConfig] - 透传 axios 配置
 */

/**
 * @typedef {import('axios').InternalAxiosRequestConfig & RequestOptions} RequestConfig
 */

export {}
