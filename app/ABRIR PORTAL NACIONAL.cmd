@echo off
title Portal Nacional
cd /d "%~dp0"

if not exist "node_modules" (
  echo Preparando Portal Nacional por primera vez...
  call npm install --no-audit --no-fund
)

start "Portal Nacional - servidor" /min cmd /c "npx vite --host 127.0.0.1 --port 5173"
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
start "" "http://127.0.0.1:5173/"
exit
