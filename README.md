# 锦食坊工程说明

从 `g:\supermarket` 拷贝改造。一期范围：

- 用户：浏览餐厅、选菜、提交到店预约（不支付、不配送）
- 商家：入驻申请、菜单管理、预约单接单
- 后台：入驻审核

## 快速启动（后端）

1. 打开 **Docker Desktop**，等引擎就绪  
2. 双击或在终端运行：

```bat
cd g:\jinshifang\wxapp-backend
setup-db.cmd
```

会自动：`docker compose up` → `prisma db push` → 种子数据。

- MySQL：`localhost:3307` / 库名 `jinshifang` / 用户 `wxapp` / 密码 `wxapp123456`
- Redis：`localhost:6380`

然后：

```bash
npm run dev
```

## 小程序

```bash
cd g:\jinshifang\wxapp-frontend
npm i
npm run dev:mp-weixin
```

## 管理后台

```bash
cd g:\jinshifang\wxapp-admin
npm i
npm run dev
```

菜单「入驻审核」对应 `/admin/onboarding`。

## 已卸下的商超能力

支付、退款、地址配送、POS 同步、旧商品购物流程主路由（`/api/pay` `/api/addresses` `/api/products` 等已不在 `app.js` 挂载）。
