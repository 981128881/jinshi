# 本地开发环境搭建

## 需要安装的软件

| 软件 | 用途 | 是否必须 |
|------|------|----------|
| **Node.js 18+** | 运行后端、管理端 | 必须 |
| **Docker Desktop** | 一键启动 MySQL + Redis（推荐） | 强烈推荐 |
| **微信开发者工具** | 编译/调试小程序 | 必须 |
| **HBuilderX** | uni-app 编译（若不用 CLI） | 二选一 |
| **Git** | 版本管理 | 推荐 |
| **VS Code / Cursor** | 编辑代码 | 推荐 |

不装 Docker 时，可分别安装：
- **MySQL 8 社区版**（免费）：https://dev.mysql.com/downloads/mysql/
- **Redis for Windows** 或用 WSL2 装 Redis

可选工具：
- **Navicat / DBeaver**：可视化管理 MySQL
- **Another Redis Desktop Manager**：查看 Redis 缓存

---

## 快速启动 MySQL + Redis（Docker）

```bash
cd wxapp-backend
docker compose up -d
```

### Docker 拉镜像失败（国内网络）

报错类似 `failed to resolve reference docker.io/library/mysql` 时，任选一种：

**方式 1：国内镜像 compose 文件（推荐）**

```bash
docker compose -f docker-compose.mirror.yml up -d
```

**方式 2：配置 Docker Desktop 镜像加速**

打开 Docker Desktop → Settings → Docker Engine，在 JSON 里加入：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1panel.live"
  ]
}
```

Apply & Restart 后重试 `docker compose up -d`。

**方式 3：不用 Docker，本机装 MySQL**

见下方「本机 MySQL（不用 Docker）」。Redis 开发阶段可跳过，后端会自动降级直读数据库。

---

## 本机 MySQL（不用 Docker）

1. 下载安装 [MySQL 8 社区版](https://dev.mysql.com/downloads/mysql/)（Windows MSI 安装器）
2. 安装时设置 root 密码，端口保持 `3306`
3. 用 MySQL Workbench 或命令行执行：

```bash
mysql -u root -p < scripts/init-mysql.sql
```

4. 确认 `.env` 中：

```
DATABASE_URL="mysql://wxapp:wxapp123456@localhost:3306/wxapp_shop"
```

5. 初始化表和数据：

```bash
npm run db:setup
npm run dev
```

> Redis 未安装不影响启动，只是没有缓存加速。

---

## 快速启动 MySQL + Redis（Docker）— 连接信息

| 服务 | 地址 | 账号 | 密码 | 库名 |
|------|------|------|------|------|
| MySQL | localhost:3306 | wxapp | wxapp123456 | wxapp_shop |
| Redis | localhost:6379 | — | — | — |

验证：

```bash
docker compose ps
```

---

## 三个项目启动顺序

```bash
# 1. 数据库
cd wxapp-backend && docker compose up -d

# 2. API（迁移到 MySQL 后）
npm install && npm run dev

# 3. 管理后台
cd ../wxapp-admin && npm install && npm run dev

# 4. 小程序：HBuilderX 运行到微信开发者工具
#    config/index.js 设 useMock: false
```

---

## MySQL 与 Redis 分工（规划）

| 存储 | 内容 |
|------|------|
| **MySQL** | 用户、商品、分类、订单、地址、活动、轮播、商家配置 |
| **Redis** | 登录 token 黑名单、商家配置缓存、热搜词缓存、接口限流、可选购物车缓存 |

---

## 当前状态

- 后端已使用 **MySQL (Prisma) + Redis**
- 初始化：`npm run db:setup`
