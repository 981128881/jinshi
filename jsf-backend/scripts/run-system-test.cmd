@echo off
setlocal
cd /d "%~dp0.."

echo ========================================
echo   商超系统全链路冒烟测试
echo ========================================
echo.

echo [检查] 后端端口 3000 ...
netstat -ano | findstr /C:":3000" | findstr LISTENING >nul
if errorlevel 1 (
  echo   后端未启动，请先运行: npm run dev
  exit /b 1
)
echo   OK

echo [检查] 管理后台端口 5173 ...
netstat -ano | findstr /C:":5173" | findstr LISTENING >nul
if errorlevel 1 (
  echo   管理后台未启动，请在 wxapp-admin 目录运行: npm run dev
) else (
  echo   OK
)

echo.
call npm run test:system
set ERR=%ERRORLEVEL%

echo.
if %ERR%==0 (
  echo 自动化测试全部通过。
  echo.
  echo 请继续手动测试:
  echo   1. 管理后台 http://localhost:5173  admin/admin123
  echo   2. 微信开发者工具打开 wxapp-frontend
  echo   3. 勾选不校验合法域名，使用开发登录
) else (
  echo 存在失败项，请根据上方输出排查。
)
exit /b %ERR%
