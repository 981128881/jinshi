@echo off
setlocal
cd /d "%~dp0.."

echo === wxapp-backend dev setup ===
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-deps.ps1"
if errorlevel 1 exit /b 1

echo.
echo Syncing database...
call pnpm run db:push
if errorlevel 1 (
  echo db:push failed. Check DATABASE_URL in .env and MySQL is running.
  exit /b 1
)

echo.
echo Done. Start backend with: pnpm run dev
endlocal
