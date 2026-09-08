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

COMPOSE="$ROOT/jsf-backend/docker-compose.mirror.yml"
if [[ ! -f "$COMPOSE" ]]; then
  COMPOSE="$ROOT/jsf-backend/docker-compose.yml"
fi
if [[ ! -f "$COMPOSE" ]]; then
  echo "缺少 docker compose 配置，先确认 GitHub 上有 jsf-backend/docker-compose*.yml" >&2
  ls -la "$ROOT/jsf-backend" >&2
  exit 1
fi
docker compose -f "$COMPOSE" up -d

# ponytail: lockfile 没推进 GitHub 时 ci 会拒装；有 package-lock.json 仍走 ci
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
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
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run build

pm2 save
curl -fsS "http://127.0.0.1:3000/health" >/dev/null
echo "ok"
