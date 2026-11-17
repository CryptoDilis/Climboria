@echo off
setlocal EnableExtensions
title Climboria Game - Private Two-Player QA
cd /d "%~dp0"
echo.
echo ===== CLIMBORIA GAME - PRIVATE STAGING QA =====
echo This opens two temporary Chrome test windows.
echo Login yourself in each window. NEVER share passwords or tokens.
echo The public Game multiplayer switch stays OFF.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 is required. Install it from https://nodejs.org/en/download
  echo Then double-click this launcher again. No site settings were changed.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Repair your Node.js installation.
  pause
  exit /b 1
)

if not exist "node_modules\playwright\package.json" (
  echo Setting up local Playwright dependency in the Game QA folder...
  echo This changes only local files; no website deployment.
  call npm install --no-save --no-package-lock --no-audit --no-fund playwright@1.56.1
  if errorlevel 1 (
    echo Could not install Playwright. Check network access and retry.
    pause
    exit /b 1
  )
)

echo.
echo Confirm: this will send two registered QA sessions only to
echo https://rooms.climboria.fun and the Climboria login provider.
echo Do not use real customer accounts. Press Ctrl+C to cancel.
pause
set "GAME_QA_APPROVAL=I_APPROVE_GAME_STAGING_QA"
node "%~dp0qa-mixed-login.mjs"
set "QA_EXIT=%ERRORLEVEL%"
set "GAME_QA_APPROVAL="
if not "%QA_EXIT%"=="0" (
 echo.
 echo QA has NOT passed. Production multiplayer stays OFF.
) else (
 echo.
 echo Local private QA completed. Production multiplayer still OFF.
)
echo.
pause
exit /b %QA_EXIT%
