@echo off
setlocal enabledelayedexpansion

echo ========================================
echo EasyMoneyLoans Desktop App Builder
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Found Node.js %NODE_VERSION%
echo.

:: Build Frontend
echo [1/3] Building React Frontend...
echo ----------------------------------------
cd /d "%~dp0..\frontend"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo Building production bundle...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
echo Frontend build complete!
echo.

:: Install Electron dependencies
echo [2/3] Installing Electron Dependencies...
echo ----------------------------------------
cd /d "%~dp0"
if not exist "node_modules" (
    echo Installing electron dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install electron dependencies
        pause
        exit /b 1
    )
)
echo Electron dependencies ready!
echo.

:: Build Electron App
echo [3/3] Building Windows Executable...
echo ----------------------------------------
echo Select build type:
echo   1 = Full build (installer + portable)
echo   2 = Portable only (single .exe)
echo   3 = Unpacked directory (for testing)
echo.
set /p BUILD_TYPE="Enter choice (1-3): "

if "%BUILD_TYPE%"=="1" (
    call npm run build
) else if "%BUILD_TYPE%"=="2" (
    call npm run build:portable
) else if "%BUILD_TYPE%"=="3" (
    call npm run build:dir
) else (
    echo Invalid choice, building full version...
    call npm run build
)

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Electron build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo Your application is ready in:
echo   %~dp0dist\
echo.
echo Files created:
dir /b "%~dp0dist\*.exe" 2>nul
echo.
echo Run the installer or portable .exe to start the application.
echo.
pause
