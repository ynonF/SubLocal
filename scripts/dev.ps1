# SubLocal — Dev mode launcher
# Starts the Electron + Vite dev server

param(
    [switch]$SkipPythonCheck
)

$ErrorActionPreference = "Stop"

Write-Host "`n🎬 SubLocal — Development Mode" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check Node.js
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green

# Check Python
if (-not $SkipPythonCheck) {
    $pyVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        $pyVersion = python3 --version 2>&1
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Python not found. Transcription will not work in dev mode." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Python $pyVersion" -ForegroundColor Green
    }
}

# Check FFmpeg
$ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  FFmpeg not found in PATH. Install FFmpeg for audio extraction." -ForegroundColor Yellow
    Write-Host "   Download from: https://ffmpeg.org/download.html" -ForegroundColor Yellow
} else {
    Write-Host "✓ FFmpeg found" -ForegroundColor Green
}

# Install Node dependencies if needed
$desktopPath = Join-Path $PSScriptRoot "..\apps\desktop"
if (-not (Test-Path (Join-Path $desktopPath "node_modules"))) {
    Write-Host "`n📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    Push-Location $desktopPath
    npm install
    Pop-Location
}

# Install Python dependencies if needed
$workerPath = Join-Path $PSScriptRoot "..\worker"
Write-Host "`n📦 Checking Python dependencies..." -ForegroundColor Yellow
Push-Location $workerPath
python -m pip install -r requirements.txt --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python dependencies ready" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not install Python dependencies. Run: pip install -r worker/requirements.txt" -ForegroundColor Yellow
}
Pop-Location

Write-Host "`n🚀 Starting SubLocal..." -ForegroundColor Cyan
Write-Host "   App will open automatically when ready.`n" -ForegroundColor Gray

# Start the dev server
Push-Location $desktopPath
npm run dev
Pop-Location
