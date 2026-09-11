# 商超管理后台

Vue 3 + Vite + Vue Router + Pinia + Element Plus 管理端，对接 `wxapp-backend` 的 `/api/admin` 接口。

## 技术栈

- Vue 3（Composition API）
- Vite 6
- Vue Router 4
- Pinia 2
- Element Plus 2
- Axios

## 快速开始

先启动后端 API（端口 3000）：

```bash
cd ../wxapp-backend
npm run dev
```

再启动管理端：

```bash
cd wxapp-admin
npm install
npm run dev
```

浏览器访问：http://localhost:5173

## 功能模块

| 模块 | 说明 |
|------|------|
| 仪表盘 | 商品/用户/订单统计、今日销售 |
| 商品管理 | 增删改查、分类筛选 |
| 分类管理 | 增删改 |
| 轮播管理 | 首页 Banner |
| 订单管理 | 列表、详情、状态变更 |
| 活动管理 | 弹窗促销活动 |
| 用户管理 | 小程序用户列表 |
| 商家配置 | 配送半径、坐标、客服电话 |
| 热搜词 | 搜索页热词 |

## 构建

```bash
npm run build
npm run preview
```

生产部署时将 `dist` 静态资源托管到 Nginx 等，并配置 `/api` 反向代理到后端。
# jsd-admin
