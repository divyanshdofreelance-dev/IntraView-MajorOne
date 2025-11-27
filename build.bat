@echo off
echo ============================================
echo    IntraView - One-Click Build Script
echo ============================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for CMake
where cmake >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: CMake is not installed!
    echo Please install CMake from https://cmake.org/download/
    pause
    exit /b 1
)

echo [1/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Building C++ Overlay...
call npm run build:overlay
if %errorlevel% neq 0 (
    echo ERROR: Overlay build failed!
    echo Make sure Visual Studio with C++ is installed.
    pause
    exit /b 1
)

echo.
echo [3/5] Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: TypeScript build failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Creating icon (if not exists)...
if not exist "assets\icon.ico" (
    echo WARNING: No icon.ico found in assets folder.
    echo Using default Electron icon.
    echo To add custom icon, place icon.ico in assets folder.
)

echo.
echo [5/5] Packaging application...
call npm run package
if %errorlevel% neq 0 (
    echo ERROR: Packaging failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo    BUILD COMPLETE!
echo ============================================
echo.
echo Your installer is ready in the 'release' folder:
echo   - IntraView-Setup-1.0.0.exe (Installer)
echo   - IntraView-Portable-1.0.0.exe (Portable)
echo.
echo You can now distribute these files!
echo.
pause

