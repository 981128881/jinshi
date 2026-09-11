# 阿里云生产环境部署

IP / 域名 / AppID 见 [HOSTS.md](./HOSTS.md)。给部署指令时查该文件。

## GitHub 自动部署（push `main` 即更新）

仓库根目录 `.github/workflows/deploy.yml`：push `jsf-backend` / `jsf-admin` / `deploy` 后，SSH 执行 `deploy/update.sh`。小程序不自动上架。

### 一次性：GitHub Secrets

仓库 → Settings → Secrets and variables → Actions：

| Secret | 值 |
|--------|-----|
| `ALIYUN_HOST` | ECS 公网 IP |
| `ALIYUN_USERNAME` | 一般是 `root` |
| `ALIYUN_SSH_KEY` | 能登录该机的**私钥**全文（含 `BEGIN` / `END`） |

### 一次性：服务器 clone（私钥仓库）

```bash
ssh-keygen -t ed25519 -f /root/.ssh/github_jsf -N ""
# 把 github_jsf.pub 加到 GitHub 仓库 → Settings → Deploy keys（只读）

cat >> /root/.ssh/config <<'EOF'
Host github.com
  IdentityFile /root/.ssh/github_jsf
  StrictHostKeyChecking accept-new
EOF

git clone git@github.com:981128881/jinshi.git /opt/jsf
cp /opt/jsf/jsf-backend/.env.example /opt/jsf/jsf-backend/.env
nano /opt/jsf/jsf-backend/.env   # 填生产 DATABASE_URL / JWT / 微信等
# Docker 端口是 3307 / 6380，不要抄 .env.production 里的 3306 / 6379

bash /opt/jsf/deploy/update.sh   # 第一次手动跑通后再靠 Actions
```

之后本地 `git push origin main` 就会自动更新。GitHub 网页也可以手动跑 workflow。

---

## 1. 填写域名（一次性）

将 `your-domain.com` 换成你的**备案域名**，并修改所有 `CHANGE_ME`：

```bash
cd G:/supermarket
node deploy/apply-production-env.mjs --domain=shop.example.com \
  --jwt=随机32位以上字符串 \
  --db-pass=数据库密码 \
  --admin-pass=管理后台密码 \
  --pos-token=POS同步密钥
```

会同步更新：

| 项目 | 文件 |
|------|------|
| 统一配置 | `deploy/production.env` |
| 后端 API | `wxapp-backend/.env.production` |
| 管理后台 | `wxapp-admin/.env.production` |
| 小程序 | `wxapp-frontend/.env.production`、`config/index.js` |
| POS 同步 | `AiBaoPOS/sync/config.production.yaml` |

## 2. DNS 解析（阿里云控制台）

| 记录 | 指向 |
|------|------|
| `api.your-domain.com` | 服务器公网 IP |
| `admin.your-domain.com` | 服务器公网 IP |

## 3. 服务器部署

```bash
# Docker 起 MySQL + Redis
cd wxapp-backend && docker compose up -d

# 生产配置（复制或 start:prod）
cp .env.production .env   # 或 npm run start:prod

npm run db:push
npm run start:prod

# 管理后台构建
cd ../wxapp-admin && npm run build
# dist 放到 Nginx，见 deploy/nginx.conf.example

# 小程序
cd ../wxapp-frontend && npm run build:mp-weixin
```

## 4. 微信配置

- 小程序后台 → 开发 → 开发管理 → 服务器域名：`https://api.your-domain.com`
- 填写 `WX_APPID`、`WX_SECRET`，`WX_MOCK=false`
- 支付：`WX_PAY_NOTIFY_URL` 与商户证书

## 5. 本地开发不受影响

- 后端仍用 `wxapp-backend/.env`（localhost）
- 管理后台 `.env.development`
- 小程序 `.env.development`
