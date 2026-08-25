@echo off
title Veta - Launcher
cd /d "%~dp0"

REM Buscar fnm
for /f "delims=" %%i in ('where fnm 2^>nul') do set FNM_EXE=%%i
if "%FNM_EXE%"=="" (
  for /f "delims=" %%i in ('dir /b /s "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Schniz.fnm_*\fnm.exe" 2^>nul') do set FNM_EXE=%%i
)
if "%FNM_EXE%"=="" (
  echo ERROR: No se encontro fnm.exe
  pause
  exit /b 1
)
for %%i in ("%FNM_EXE%") do set FNM_DIR=%%~dpi
set PATH=%FNM_DIR%;%PATH%

set NODE_DIR=%APPDATA%\fnm\node-versions\v24.16.0\installation
set PATH=%NODE_DIR%;%FNM_DIR%;%PATH%

echo Iniciando Veta...
echo.

start "Veta-Backend" cmd /k "set PATH=%APPDATA%\fnm\node-versions\v24.16.0\installation;%PATH% && cd /d "%~dp0" && node server/index.js"

echo Esperando backend...
set RETRIES=0
:wait_backend
timeout /t 1 /nobreak >nul
set /a RETRIES+=1
curl -s -o nul http://127.0.0.1:3001/api/cells && goto backend_ready
if %RETRIES% GEQ 15 (
  echo ERROR: Backend no respondio despues de 15 segundos.
  pause
  exit /b 1
)
goto wait_backend

:backend_ready
echo Backend listo.
start "Veta-Frontend" cmd /k "set PATH=%APPDATA%\fnm\node-versions\v24.16.0\installation;%PATH% && cd /d "%~dp0" && npx vite"

echo.
echo ================================================
echo  Abre: http://localhost:5173
echo ================================================
echo (Puedes cerrar esta ventana)
timeout /t 5

