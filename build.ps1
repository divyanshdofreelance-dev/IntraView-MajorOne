# IntraView - One-Click Build Script (PowerShell)
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   IntraView - One-Click Build Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for CMake
$cmake = Get-Command cmake -ErrorAction SilentlyContinue
if (-not $cmake) {
    Write-Host "ERROR: CMake is not installed!" -ForegroundColor Red
    Write-Host "Please install CMake from https://cmake.org/download/"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/5] Building C++ Overlay..." -ForegroundColor Yellow
npm run build:overlay
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Overlay build failed!" -ForegroundColor Red
    Write-Host "Make sure Visual Studio with C++ is installed."
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[3/5] Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: TypeScript build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[4/5] Checking for icon..." -ForegroundColor Yellow
if (-not (Test-Path "assets\icon.ico")) {
    Write-Host "WARNING: No icon.ico found in assets folder." -ForegroundColor Yellow
    Write-Host "Using default Electron icon."
    Write-Host "To add custom icon, place icon.ico in assets folder."
}

Write-Host ""
Write-Host "[5/5] Packaging application..." -ForegroundColor Yellow
npm run package
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Packaging failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   BUILD COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your installer is ready in the 'release' folder:" -ForegroundColor White
Write-Host "  - IntraView-Setup-1.0.0.exe (Installer)" -ForegroundColor Cyan
Write-Host "  - IntraView-Portable-1.0.0.exe (Portable)" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now distribute these files!" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"

