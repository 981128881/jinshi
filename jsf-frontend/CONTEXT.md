# 商超小程序 — 领域词汇（前端）

Read this before naming variables, routes, issues, or tests in `wxapp-frontend`.

## Core concepts

| Term | Meaning |
| ---- | ------- |
| **SKU** | 可售商品单元；列表/详情/购物车均围绕 SKU |
| **购物车 (cart)** | 用户待结算商品集合；状态在 `stores/cart.js` |
| **订单 (order)** | 用户提交购物车后生成的交易记录 |
| **地址 (address)** | 收货地址；下单前需选择 |
| **分类 (category)** | 商品类目；首页与分类页入口 |
| **秒杀 (flash sale)** | 限时促销区块；首页 `flashProducts` |
| **主包 / 分包** | 微信小程序包体积策略；见 `tech-specs.md` |

## UI vocabulary

| Term | Meaning |
| ---- | ------- |
| **TabBar** | 底部导航：首页、分类、购物车、我的 |
| **primary** | 品牌主色；见 `ui-guidelines.md` 与 `App.vue` CSS 变量 |
| **商品卡片 (ProductCard)** | 列表中的标准商品展示组件 |

## Avoid

- Don't say "item" when you mean **SKU** or **cart line**.
- Don't say "profile" when you mean **我的 (mine)** page.
