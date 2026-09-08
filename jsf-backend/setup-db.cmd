@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === 锦食坊数据库初始化（复用 wxapp-mysql:3306） ===
echo.

docker ps --filter name=wxapp-mysql --format "{{.Names}} {{.Status}}" | findstr wxapp-mysql >nul
if errorlevel 1 (
  echo [错误] 容器 wxapp-mysql 未运行。请先启动商超/本机 Docker 中的 MySQL。
  echo 也可: docker start wxapp-mysql wxapp-redis
  pause
  exit /b 1
)

echo [1/3] 创建库 jinshifang...
docker exec -i wxapp-mysql mysql -uroot -proot123456 < prisma\init-db.sql
if errorlevel 1 (
  echo 建库失败
  pause
  exit /b 1
)

echo [2/3] Prisma 推表...
call npm run db:push
if errorlevel 1 (
  echo 若提示 EPERM，请先关掉 npm run dev 再重试
  pause
  exit /b 1
)

echo [3/3] 种子数据...
node prisma\seed-jinshifang.js
if errorlevel 1 (
  echo seed 失败
  pause
  exit /b 1
)

echo.
echo === 完成 ===
echo DATABASE_URL=mysql://wxapp:wxapp123456@localhost:3306/jinshifang
echo 启动: npm run dev
echo.
pause
