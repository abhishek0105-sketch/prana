@echo off
echo.
echo  ============================================
echo    PRANA - Be Together. From Anywhere.
echo  ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo  ERROR: Node.js is not installed.
  echo.
  echo  Please install Node.js first:
  echo  1. Go to https://nodejs.org
  echo  2. Download the LTS version
  echo  3. Install it, then run this script again
  echo.
  pause
  exit /b 1
)

echo  Node.js found:
node --version

:: Install server deps if needed
if not exist "server\node_modules" (
  echo.
  echo  Installing server packages... (first time only)
  cd server
  npm install
  cd ..
)

:: Install client deps if needed
if not exist "client\node_modules" (
  echo.
  echo  Installing app packages... (first time only)
  cd client
  npm install
  cd ..
)

echo.
echo  Starting PRANA...
echo  - Server: http://localhost:4000
echo  - App:    http://localhost:5173
echo.
echo  Open http://localhost:5173 in your browser
echo  Press Ctrl+C to stop
echo.

:: Start server in background
start "PRANA Server" cmd /c "cd server && npm run dev"

:: Wait a moment then start client
timeout /t 2 /nobreak >nul

:: Start client
cd client
npm run dev
