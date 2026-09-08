# 商超小程序后台 API

Node.js + Express + **MySQL (Prisma)** + **Redis** 缓存。

## 技术栈

- Express — HTTP 框架
- Prisma — MySQL ORM
- Redis (ioredis) — 商家配置、热搜词、轮播等缓存
- JWT — 鉴权

## 快速开始

### 1. 启动 MySQL + Redis

```bash
docker compose up -d
```

Docker Hub 连不上（国内常见）时用镜像源：

```bash
docker compose -f docker-compose.mirror.yml up -d
```

或本机安装 MySQL，见 `docs/SETUP.md`。

### 2. 安装依赖并初始化数据库

```bash
npm install
npm run db:setup    # prisma db push + seed
```

### 3. 启动 API

```bash
npm run dev
```

服务地址：`http://localhost:3000/api`

## 环境变量

见 `.env.example`：

| 变量 | 说明 |
|------|------|
| DATABASE_URL | MySQL 连接串 |
| REDIS_URL | Redis 地址 |
| ADMIN_USERNAME/PASSWORD | 管理后台账号 |

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式 |
| `npm run db:push` | 同步表结构 |
| `npm run db:seed` | 写入种子数据 |
| `npm run db:setup` | push + seed |

## Redis 缓存

| Key | 内容 | TTL |
|-----|------|-----|
| cache:shop:config | 商家配置 | 600s |
| cache:search:hot-keywords | 热搜词 | 600s |
| cache:home:banners | 轮播图 | 300s |
| cache:categories:list | 分类列表 | 300s |

Redis 未连接时自动降级为直读 MySQL。

## 对接

- 小程序：`wxapp-frontend`，`useMock: false`
- 管理端：`wxapp-admin`，`/api/admin/*`
- **爱宝 POS 同步**：`G:\supermarket\AiBaoPOS\sync`，见下方

### 爱宝 POS 商品同步

1. `.env` 设置 `POS_SYNC_TOKEN=你的密钥`
2. 执行数据库补丁：`npm run db:patch-pos-sync`
3. 启动服务后，POS 端运行 `AiBaoPOS\sync\run_sync.bat`

| 接口 | 说明 |
|------|------|
| `POST /api/sync/categories` | 批量 upsert 分类（`externalId`） |
| `POST /api/sync/products` | 批量 upsert 商品（SKU 扁平化为 Product） |
| `POST /api/sync/stock` | 增量更新库存/价格 |

鉴权：`Authorization: Bearer <POS_SYNC_TOKEN>`

详细字段映射见 `G:\supermarket\AiBaoPOS\sync\WXAPP_BACKEND.md`。

详细安装说明见 `docs/SETUP.md`。
