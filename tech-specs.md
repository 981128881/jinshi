# 商超微信小程序 - 技术架构与规范补充

## 一、微信分包策略

### 1.1 分包原则
- **主包**：核心页面和公共资源，不超过 2MB
- **分包**：按业务模块划分，单个分包不超过 2MB
- **总包限制**：所有分包加起来不超过 20MB

### 1.2 分包结构规划

`
主包 (main package) - 必须包含的内容
├── pages/index/              # 首页（入口页必须在主包）
├── pages/category/           # 分类页（高频访问）
├── components/common/        # 公共组件
├── utils/                    # 工具函数
├── stores/                   # 状态管理
├── api/                      # API 封装
└── static/images/            # 常用图标、logo

分包1: package_product (商品相关)
├── pages/product/detail      # 商品详情
├── pages/product/list        # 商品列表
└── components/product/       # 商品相关组件

分包2: package_cart (购物车相关)
├── pages/cart/index          # 购物车
└── components/cart/          # 购物车组件

分包3: package_order (订单相关)
├── pages/order/list          # 订单列表
├── pages/order/detail        # 订单详情
├── pages/order/create        # 创建订单
└── components/order/         # 订单相关组件

分包4: package_user (用户相关)
├── pages/user/index          # 用户中心
├── pages/user/address/list   # 地址列表
├── pages/user/address/edit   # 编辑地址
└── components/user/          # 用户相关组件
`

### 1.3 pages.json 配置示例

`json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "首页"
      }
    },
    {
      "path": "pages/category/index",
      "style": {
        "navigationBarTitleText": "分类"
      }
    }
  ],
  "subPackages": [
    {
      "root": "package_product",
      "pages": [
        {
          "path": "pages/product/detail",
          "style": {
            "navigationBarTitleText": "商品详情"
          }
        },
        {
          "path": "pages/product/list",
          "style": {
            "navigationBarTitleText": "商品列表"
          }
        }
      ]
    },
    {
      "root": "package_cart",
      "pages": [
        {
          "path": "pages/cart/index",
          "style": {
            "navigationBarTitleText": "购物车"
          }
        }
      ]
    },
    {
      "root": "package_order",
      "pages": [
        {
          "path": "pages/order/list",
          "style": {
            "navigationBarTitleText": "我的订单"
          }
        },
        {
          "path": "pages/order/detail",
          "style": {
            "navigationBarTitleText": "订单详情"
          }
        },
        {
          "path": "pages/order/create",
          "style": {
            "navigationBarTitleText": "确认订单"
          }
        }
      ]
    },
    {
      "root": "package_user",
      "pages": [
        {
          "path": "pages/user/index",
          "style": {
            "navigationBarTitleText": "我的"
          }
        },
        {
          "path": "pages/user/address/list",
          "style": {
            "navigationBarTitleText": "收货地址"
          }
        },
        {
          "path": "pages/user/address/edit",
          "style": {
            "navigationBarTitleText": "编辑地址"
          }
        }
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["package_product"]
    }
  }
}
`

### 1.4 预加载策略
- **首页预加载商品分包**：用户从首页进入商品详情的概率高
- **购物车预加载订单分包**：结算流程连贯性
- **避免过度预加载**：只预加载最可能访问的 1-2 个分包

### 1.5 分包优化技巧
- 提取公共组件到主包，避免重复打包
- 图片资源按需加载，不放在主包
- 使用 equire.async 动态加载非关键资源
- 定期分析包体积，优化冗余代码

---

## 二、API 接口规范

### 2.1 RESTful 设计规范

#### 基础 URL
`
开发环境: https://dev-api.example.com/api/v1
生产环境: https://api.example.com/api/v1
`

#### 通用响应格式
`	ypescript
// 成功响应
{
  "code": 200,
  "message": "success",
  "data": {
    // 具体数据
  }
}

// 失败响应
{
  "code": 40001,
  "message": "参数错误",
  "data": null
}

// 分页响应
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
`

#### 状态码规范
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 参数错误 |
| 401 | 未登录或 Token 失效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 2.2 接口模块划分

#### 认证模块 (/auth)
`
POST   /auth/login              # 微信登录
POST   /auth/refresh            # 刷新 Token
GET    /auth/userinfo           # 获取用户信息
`

#### 商品模块 (/products)
`
GET    /products                # 商品列表（支持分页、筛选、排序）
GET    /products/:id            # 商品详情
GET    /products/search         # 搜索商品
GET    /products/recommend      # 推荐商品
`

#### 分类模块 (/categories)
`
GET    /categories              # 分类列表
GET    /categories/:id/products # 分类下的商品
`

#### 购物车模块 (/cart)
`
GET    /cart                    # 获取购物车
POST   /cart/items              # 添加商品到购物车
PUT    /cart/items/:id          # 更新购物车商品数量
DELETE /cart/items/:id          # 删除购物车商品
DELETE /cart/clear              # 清空购物车
`

#### 订单模块 (/orders)
`
GET    /orders                  # 订单列表（支持状态筛选）
GET    /orders/:id              # 订单详情
POST   /orders                  # 创建订单
POST   /orders/:id/pay          # 支付订单
POST   /orders/:id/cancel       # 取消订单
POST   /orders/:id/confirm      # 确认收货
`

#### 地址模块 (/addresses)
`
GET    /addresses               # 地址列表
GET    /addresses/:id           # 地址详情
POST   /addresses               # 新增地址
PUT    /addresses/:id           # 更新地址
DELETE /addresses/:id           # 删除地址
GET    /addresses/default       # 获取默认地址
`

### 2.3 请求参数规范

#### 分页参数
`	ypescript
interface PaginationParams {
  page: number;        // 页码，从 1 开始
  pageSize: number;    // 每页数量，默认 10，最大 100
}
`

#### 排序参数
`	ypescript
interface SortParams {
  sortBy: string;      // 排序字段：price, sales, createTime
  order: 'asc' | 'desc'; // 排序方式
}
`

#### 筛选参数
`	ypescript
interface FilterParams {
  categoryId?: number;   // 分类 ID
  minPrice?: number;     // 最低价格
  maxPrice?: number;     // 最高价格
  keyword?: string;      // 搜索关键词
}
`

### 2.4 前端 API 封装示例

`	ypescript
// utils/request.ts
import type { ApiResponse } from '@/types/api'

const BASE_URL = process.env.VUE_APP_API_BASE_URL

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  needAuth?: boolean
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, header = {}, needAuth = true } = options
  
  const token = uni.getStorageSync('token')
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: ${BASE_URL},
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(needAuth && token ? { 'Authorization': Bearer  } : {}),
        ...header
      },
      success: (res) => {
        const response = res.data as ApiResponse<T>
        
        if (response.code === 200) {
          resolve(response.data)
        } else if (response.code === 401) {
          // Token 失效，跳转登录
          uni.removeStorageSync('token')
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('未登录'))
        } else {
          uni.showToast({
            title: response.message || '请求失败',
            icon: 'none'
          })
          reject(new Error(response.message))
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

// api/product.ts
import { request } from '@/utils/request'
import type { Product, ProductListResponse } from '@/types/product'

export function getProductList(params: {
  page: number
  pageSize: number
  categoryId?: number
  keyword?: string
}) {
  return request<ProductListResponse>({
    url: '/products',
    method: 'GET',
    data: params
  })
}

export function getProductDetail(id: number) {
  return request<Product>({
    url: /products/,
    method: 'GET'
  })
}
`

### 2.5 TypeScript 类型定义

`	ypescript
// types/api.ts
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface PageResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// types/product.ts
export interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number
  image: string
  images?: string[]
  description?: string
  stock: number
  sales: number
  categoryId: number
  categoryName?: string
  specs?: ProductSpec[]
}

export interface ProductSpec {
  id: number
  name: string
  value: string
  stock: number
  price?: number
}

export interface ProductListResponse extends PageResponse<Product> {}
`

---

## 三、其他重要注意事项

### 3.1 性能优化

#### 图片优化
- 使用 WebP 格式（兼容性处理）
- 图片懒加载：<image lazy-load />
- 缩略图与大图分离
- CDN 加速静态资源

#### 列表优化
- 长列表使用虚拟滚动（uni-app 可用 ecycle-view）
- 下拉刷新 + 上拉加载更多
- 防抖搜索输入

#### 缓存策略
`	ypescript
// 商品详情缓存（5分钟）
const CACHE_DURATION = 5 * 60 * 1000

export async function getProductWithCache(id: number) {
  const cacheKey = product_
  const cached = uni.getStorageSync(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  const data = await getProductDetail(id)
  uni.setStorageSync(cacheKey, {
    data,
    timestamp: Date.now()
  })
  
  return data
}
`

### 3.2 用户体验优化

#### 骨架屏
`ue
<template>
  <view v-if="loading">
    <skeleton-card />
  </view>
  <view v-else>
    <!-- 实际内容 -->
  </view>
</template>
`

#### 空状态处理
- 购物车为空：引导去购物
- 订单为空：引导去浏览商品
- 搜索无结果：推荐热门商品

#### 加载状态
- 页面级加载：全屏 Loading
- 局部加载：Skeleton 或 Spinner
- 按钮加载：禁用 + Loading 图标

### 3.3 安全性

#### 敏感数据处理
- Token 存储在 uni.setStorageSync（加密可选）
- 用户手机号等敏感信息脱敏显示
- HTTPS 强制使用

#### 防重复提交
`	ypescript
let isSubmitting = false

export async function submitOrder(data: OrderData) {
  if (isSubmitting) {
    uni.showToast({ title: '请勿重复提交', icon: 'none' })
    return
  }
  
  isSubmitting = true
  try {
    await createOrder(data)
  } finally {
    isSubmitting = false
  }
}
`

### 3.4 兼容性处理

#### iOS/Android 差异
- 日期格式化统一使用库（如 dayjs）
- 键盘弹出时页面适配
- 底部安全区域处理

#### 微信版本兼容
- 检查 API 可用性：uni.canIUse()
- 降级方案准备
- 最低支持版本：微信 7.0+

### 3.5 错误监控

#### 全局错误捕获
`	ypescript
// App.vue
onLaunch(() => {
  uni.onError((err) => {
    console.error('全局错误:', err)
    // 上报错误日志
  })
})
`

#### 接口错误统计
- 记录失败接口、错误码、频次
- 用户反馈入口

### 3.6 测试策略

#### 单元测试
- 工具函数测试
- Store 状态管理测试
- API 封装测试

#### 真机测试
- iOS 和 Android 各至少 2 款机型
- 不同屏幕尺寸验证
- 弱网环境测试

### 3.7 发布准备

#### 代码审查清单
- [ ] 移除 console.log
- [ ] 检查硬编码配置
- [ ] 验证分包配置
- [ ] 测试关键流程
- [ ] 检查图片资源大小

#### 小程序审核注意
- 隐私政策合规
- 用户授权说明清晰
- 功能完整可用
- 无违规内容

---

## 四、开发工具推荐

### 4.1 IDE
- **HBuilderX**：UniApp 官方 IDE，内置调试工具
- **VS Code**：配合 UniApp 插件使用

### 4.2 调试工具
- 微信开发者工具
- Chrome DevTools（H5 调试）

### 4.3 辅助工具
- Postman：API 测试
- Figma/Sketch：UI 设计稿查看
- Charles/Fiddler：网络抓包

---

**版本**: v1.0  
**更新日期**: 2026-06-29
