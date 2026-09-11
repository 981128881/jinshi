# 金石菜牌 · 主机与账号（给指令时查这里，不要问用户）

密钥、密码、JWT **不要**写进本文件。

## 生产

| 项 | 值 |
|---|---|
| ECS 公网 IP | `8.130.114.70` |
| SSH | `root@8.130.114.70` |
| 规格 | 2 核 2G |
| 代码目录 | `/opt/jsf` |
| API 进程 | pm2 `jsf-api`（`src/index.js`） |
| 备案域名 | `cr20.help` |
| API | `https://api.cr20.help` |
| 管理后台 | `https://admin.cr20.help` |
| CORS | `https://admin.cr20.help,https://api.cr20.help` |
| 服务器 MySQL | `127.0.0.1:3307`（Docker） |
| 服务器 Redis | `127.0.0.1:6380`（Docker） |

## 微信

| 项 | 值 |
|---|---|
| 小程序 AppID | `wx3e9ed4f2f6d1d105` |
| 出处 | `jsf-frontend/manifest.json` → `mp-weixin.appid` |
| 合法域名 | `https://api.cr20.help` |

## Git / 自动部署

| 项 | 值 |
|---|---|
| GitHub | `981128881/jinshi` |
| 服务器更新 | `bash /opt/jsf/deploy/update.sh` |
| Actions | push `main`（`jsf-backend` / `jsf-admin` / `deploy`）SSH 跑 update.sh |
| Secrets | `ALIYUN_HOST` = `8.130.114.70`，用户 `root` |

## 本机开发

| 项 | 值 |
|---|---|
| 仓库 | `G:\jinshifang` |
| 本地 API | `http://localhost:3000` |
| 管理后台 | Vite `5173` / `5174` |
| 本地 MySQL | `localhost:3306`（复用 wxapp-mysql，见 `.env` 注释） |
| 本地 Redis | `localhost:6379` |

给用户指令时：SSH/scp 用 `root@8.130.114.70`，URL 用上面的域名，不要写「你的服务器IP」。
