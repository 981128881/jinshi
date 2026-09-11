# 商超小程序 API 接口文档

> Base URL: `{baseUrl}`（见 `config/index.js`，默认 `http://localhost:3000/api`）  
> 统一响应格式：`{ "code": 0, "message": "ok", "data": {} }`  
> 成功码：`0` 或 `200`  
> 鉴权：Header `Authorization: Bearer {token}`

---

## 1. 认证

### 1.1 静默登录（已有 token 时刷新）

- **POST** `/auth/wx-login`
- **鉴权**：否

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | `uni.login` 获取的微信 code |

**响应 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | JWT |
| userInfo | object | 用户信息，见下方 |

**userInfo**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 用户 ID |
| nickname | string | 昵称 |
| avatar | string | 头像 URL |
| phone | string | 手机号 |
| isLogin | boolean | 是否登录 |

---

### 1.2 手机号一键登录（首次）

- **POST** `/auth/phone-login`
- **鉴权**：否

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| loginCode | string | 是 | `uni.login` 的 code |
| phoneCode | string | 是 | `getPhoneNumber` 返回的 code |

**响应 data**：同 1.1

---

### 1.3 获取用户信息

- **GET** `/user/info`

**响应 data**：userInfo 对象

---

## 2. 首页 & 商品

### 2.1 轮播图

- **GET** `/home/banners`

**响应 data**：`Banner[]`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | ID |
| imageUrl | string | 图片 |
| title | string | 标题 |
| link | string | 跳转链接（可选） |

---

### 2.2 推荐商品

- **GET** `/home/recommend`

**响应 data**：`Product[]`

---

### 2.3 分类列表

- **GET** `/categories`

**响应 data**：`Category[]`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 分类 ID |
| name | string | 名称 |
| icon | string | 图标 |

---

### 2.4 商品列表

- **GET** `/products`

**Query**

| 字段 | 类型 | 说明 |
|------|------|------|
| categoryId | number | 分类 ID（可选） |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应 data**：`Product[]`

**Product**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 商品 ID |
| categoryId | number | 分类 |
| name | string | 名称 |
| price | number | 售价 |
| originalPrice | number | 原价 |
| image | string | 主图 |
| sales | number | 销量 |
| tags | string[] | 标签 |
| desc | string | 详情描述 |

---

### 2.5 商品详情

- **GET** `/products/{id}`

---

### 2.6 商品搜索

- **GET** `/products/search?keyword=苹果`

**响应 data**：`Product[]`

---

### 2.7 热门搜索词

- **GET** `/search/hot-keywords`

**响应 data**：`string[]`

---

## 3. 商家配置 & 配送

### 3.1 商家配置

- **GET** `/config/shop`

**响应 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 商家名称 |
| latitude | number | 纬度 |
| longitude | number | 经度 |
| deliveryRadiusKm | number | 配送半径（公里） |
| servicePhone | string | 客服电话 |

> 前端购买前获取用户定位，计算与商家距离，超出 `deliveryRadiusKm` 则不可下单。

---

## 4. 优惠活动

### 4.1 当前有效活动（弹窗）

- **GET** `/promotion/active`

**响应 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 活动 ID |
| title | string | 标题 |
| imageUrl | string | 弹窗图片 |
| content | string | 详情 HTML |
| startTime | string | 开始时间 |
| endTime | string | 结束时间 |
| enabled | boolean | 是否启用 |

---

### 4.2 活动详情

- **GET** `/promotion/{id}`

---

## 5. 购物车

### 5.1 购物车列表

- **GET** `/cart`

### 5.2 加入购物车

- **POST** `/cart`

| 字段 | 类型 | 说明 |
|------|------|------|
| productId | number | 商品 ID |
| quantity | number | 数量 |

### 5.3 更新数量

- **POST** `/cart/{id}` — body: `{ quantity }`

### 5.4 删除

- **POST** `/cart/{id}/delete`

---

## 6. 订单

### 6.1 订单列表

- **GET** `/orders?status=1`

**status**：`0`全部 `1`待付款 `2`待发货 `3`待收货 `4`已完成

**响应 data**：`Order[]`

**Order**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 订单号 |
| status | number | 状态 |
| createTime | string | 创建时间 |
| totalAmount | number | 合计金额 |
| items | OrderItem[] | 商品明细 |

**OrderItem**：`id, name, price, quantity, image`

---

### 6.2 订单数量统计

- **GET** `/user/order-counts`

**响应 data**

```json
{ "unpaid": 0, "unshipped": 0, "unreceived": 0, "completed": 0 }
```

---

### 6.3 创建订单

- **POST** `/orders`

| 字段 | 类型 | 说明 |
|------|------|------|
| addressId | number | 收货地址 |
| items | array | 商品列表 |
| latitude | number | 用户纬度 |
| longitude | number | 用户经度 |

---

### 6.4 支付订单

- **POST** `/orders/{orderId}/pay`

---

### 6.5 确认收货

- **POST** `/orders/{orderId}/confirm`

---

## 7. 收货地址

### 7.1 地址列表

- **GET** `/addresses`

**Address**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | ID |
| name | string | 收货人 |
| phone | string | 手机号 |
| province | string | 省 |
| city | string | 市 |
| district | string | 区 |
| detail | string | 详细地址 |
| isDefault | boolean | 是否默认 |

---

### 7.2 默认地址

- **GET** `/addresses/default`

---

### 7.3 新增地址

- **POST** `/addresses`

---

### 7.4 更新地址

- **POST** `/addresses/{id}`

---

### 7.5 删除地址

- **POST** `/addresses/{id}/delete`

---

## 8. 错误码

| code | 说明 |
|------|------|
| 0 / 200 | 成功 |
| 401 | 未登录 / token 失效 |
| 400 | 参数错误 |
| 500 | 服务器错误 |
