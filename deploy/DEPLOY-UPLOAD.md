# 项目很大 · 如何上云（绕过 Gitee 100MB 限制）

Gitee 适合存 **源码**（通常 10～30MB），不适合存整个「商超文件夹」。

大体积通常来自：

| 目录 | 说明 | 是否进 Git |
|------|------|------------|
| `**/node_modules/` | npm 依赖 | 否，服务器 `npm ci` |
| `wxapp-frontend/unpackage/` | 小程序编译产物 | 否，服务器或本地 build |
| `wxapp-backend/public/products/` | 1.7 万+ 商品图 | 否，OSS 或 rsync |
| `AiBaoPOS/` | 收银数据库/导出 | 否，留店内 |
| `.git` 历史里的大文件 | 曾经误提交 | 需清理历史 |

---

## 方案 A（推荐）：Gitee 只推源码 + 服务器构建

1. 使用仓库根目录 `.gitignore`（已添加）
2. 只提交：`wxapp-backend` / `wxapp-admin` / `wxapp-frontend` 源码 + `deploy/`
3. 服务器：

```bash
git clone https://gitee.com/你的账号/shangchao.git /opt/supermarket
cd /opt/supermarket/wxapp-backend && npm ci && npm run start:prod
cd ../wxapp-admin && npm ci && npm run build
cd ../wxapp-frontend && npm ci && npm run build:mp-weixin
```

4. **商品图**单独处理（三选一）：
   - 阿里云 OSS + 后台改图片 URL
   - `rsync` 本机 `public/products/` → 服务器（见方案 B）
   - 服务器上重新跑 `npm run fetch:images:top40`（仅 Top 商品）

---

## 方案 B：不用 Git 部署，直接 rsync / scp

适合一次性迁移或 Git 仍超限。

**Windows（Git Bash 或 WSL）：**

```bash
rsync -avz --progress \
  --exclude-from=deploy/upload-exclude.txt \
  /g/supermarket/ \
  root@你的服务器IP:/opt/supermarket/
```

**仅传商品图：**

```bash
rsync -avz --progress \
  wxapp-backend/public/products/ \
  root@IP:/opt/supermarket/wxapp-backend/public/products/
```

**PowerShell 无 rsync 时：** 用 WinSCP / FileZilla，加载 `upload-exclude.txt` 作过滤规则。

---

## 方案 C：拆成多个 Gitee 仓库

| 仓库 | 内容 | 体积 |
|------|------|------|
| wxapp-backend | API 源码 | ~5MB |
| wxapp-admin | 管理后台 | ~3MB |
| wxapp-frontend | 小程序 | ~5MB |

POS、图片、Android 可不进 Git。

---

## 方案 D：Git 历史已经很大

若以前误提交过 `node_modules` 或图片，推送仍超 100MB：

```bash
# 查看最大的已跟踪文件
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ {print $3, $4}' | sort -rn | head -20
```

清理（需团队同意）：

- [git-filter-repo](https://github.com/newren/git-filter-repo) 删除大路径
- 或 **新建空仓库** + 正确 `.gitignore` 后只推当前源码（最简单）

---

## 方案 E：大文件用阿里云 OSS（长期推荐）

1. 商品图上传 **OSS** `your-bucket/products/`
2. 后端 `PUBLIC_BASE_URL` / 图片 URL 指向 OSS CDN
3. Git 只保留代码，体积长期 < 50MB

---

## 推荐组合（日均 20 人商超）

```
Gitee：源码 3 个项目（或 monorepo + .gitignore）
  ↓ clone 到阿里云
服务器：Docker MySQL/Redis + npm ci + build
图片：OSS 或 rsync 一次 public/products
POS：仍留店里，config.production.yaml 指向云端 API
```

本地开发 `.env` 不变；生产用 `deploy/production.env`。
