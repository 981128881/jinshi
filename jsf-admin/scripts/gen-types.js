#!/usr/bin/env node
/**
 * OpenAPI 类型生成占位脚本。
 * 对接后端 Swagger 后可执行：
 *   npx openapi-typescript http://localhost:3000/v3/api-docs -o src/api/types/generated.d.ts
 */
console.log('[gen:types] 请将 OpenAPI 文档地址写入 package.json scripts 后运行 openapi-typescript。')
console.log('当前项目使用 JSDoc 类型，见 src/api/request/types.js 与各 api/modules/*.js')
