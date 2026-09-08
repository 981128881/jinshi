#!/usr/bin/env bash
# 服务器上执行：git pull → 装依赖 → 重启 API → 构建管理后台
set -euo pipefail

ROOT="${JSF_ROOT:-/opt/jsf}"
BRANCH="${JSF_BRANCH:-main}"

if [[ ! -d "$ROOT/.git" ]]; then
  echo "先把仓库 clone 到 $ROOT" >&2
  exit 1
fi

# 先 pull 再 exec，保证这次跑的是仓库里最新的脚本
if [[ "${1:-}" != "--skip-pull" ]]; then
  cd "$ROOT"
  git fetch origin "$BRANCH"
  git merge --ff-only "origin/$BRANCH"
  exec bash "$ROOT/deploy/update.sh" --skip-pull
fi

cd "$ROOT/jsf-backend"
if [[ ! -f .env ]]; then
  echo "缺少 $ROOT/jsf-backend/.env （生产密钥，不要提交 Git）" >&2
  exit 1
fi

# 国内默认 mirror；没这个文件就用 docker-compose.yml
if [[ -f docker-compose.mirror.yml ]]; then
  docker compose -f docker-compose.mirror.yml up -d
else
  docker compose up -d
fi

npm ci
npx prisma db push
export NODE_ENV=production
if pm2 describe jsf-api >/dev/null 2>&1; then
  pm2 restart jsf-api --update-env
else
  pm2 start src/index.js --name jsf-api
fi

cd "$ROOT/jsf-admin"
# ponytail: 覆盖仓库里指向 localhost 的 .env.production；要 OSS 域名就手改这个文件
if [[ ! -f .env.production.local ]]; then
  printf 'VITE_API_BASE=/api\nVITE_FILE_BASE=\nVITE_USE_MOCK=false\n' > .env.production.local
fi
npm ci
npm run build

pm2 save
curl -fsS "http://127.0.0.1:3000/health" >/dev/null
echo "ok"
