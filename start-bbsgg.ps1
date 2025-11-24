# Quick Start Script for p2p.bbsgg.com
# Sunucu tarafı - Her şeyi otomatik başlatır

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 p2p.bbsgg.com - Server Startup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ARIA2_CONFIG = "aria2-bbsgg.conf"
$SERVER_DIR = "server"

# Check if aria2c is installed
Write-Host "📦 Checking aria2 installation..." -ForegroundColor Yellow
try {
    $null = & aria2c --version 2>&1
    Write-Host "✓ aria2 found" -ForegroundColor Green
}
catch {
    Write-Host "✗ aria2 not found!" -ForegroundColor Red
    Write-Host "   Install with: choco install aria2" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check if Node.js is installed
Write-Host "📦 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ Node.js not found!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check if aria2 is already running
Write-Host "🔍 Checking if aria2 is already running..." -ForegroundColor Yellow
$aria2Process = Get-Process -Name "aria2c" -ErrorAction SilentlyContinue
if ($aria2Process) {
    Write-Host "⚠ aria2 is already running (PID: $($aria2Process.Id))" -ForegroundColor Yellow
    $response = Read-Host "Do you want to restart it? (y/n)"
    if ($response -eq 'y') {
        Write-Host "Stopping existing aria2 process..." -ForegroundColor Yellow
        Stop-Process -Name "aria2c" -Force
        Start-Sleep -Seconds 2
    }
    else {
        Write-Host "Using existing aria2 instance" -ForegroundColor Green
        $skipAria2 = $true
    }
}
Write-Host ""

# Start aria2 if not skipped
if (-not $skipAria2) {
    Write-Host "🚀 Starting aria2 RPC server..." -ForegroundColor Yellow
    Write-Host "   Config: $ARIA2_CONFIG" -ForegroundColor Gray
    Write-Host "   Domain: p2p.bbsgg.com" -ForegroundColor Gray
    Write-Host "   External IP: 92.44.80.248" -ForegroundColor Gray
    
    # Check if config exists
    if (-not (Test-Path "$SERVER_DIR\$ARIA2_CONFIG")) {
        Write-Host "✗ Config file not found: $SERVER_DIR\$ARIA2_CONFIG" -ForegroundColor Red
        exit 1
    }
    
    # Start aria2 in background
    Start-Process -FilePath "aria2c" -ArgumentList "--conf-path=$SERVER_DIR\$ARIA2_CONFIG" -WindowStyle Hidden
    
    Write-Host "✓ aria2 started" -ForegroundColor Green
    Start-Sleep -Seconds 3
    
    # Test aria2 connection
    try {
        $testPayload = @{
            jsonrpc = "2.0"
            id      = "test"
            method  = "aria2.getVersion"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:6800/jsonrpc" -Method Post -Body $testPayload -ContentType "application/json" -ErrorAction Stop
        Write-Host "✓ aria2 RPC is responding (v$($response.result.version))" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to connect to aria2 RPC" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "⚠ Not in project root. Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Check if server directory exists
if (-not (Test-Path $SERVER_DIR)) {
    Write-Host "✗ Server directory not found!" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists in server
if (-not (Test-Path "$SERVER_DIR\node_modules")) {
    Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
    Push-Location $SERVER_DIR
    npm install
    Pop-Location
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Starting Master Server..." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Domain:        https://p2p.bbsgg.com" -ForegroundColor Cyan
Write-Host "Tracker:       https://p2p.bbsgg.com/announce" -ForegroundColor Cyan
Write-Host "Aria2 RPC:     http://localhost:6800/jsonrpc" -ForegroundColor Cyan
Write-Host "External IP:   92.44.80.248" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Cleanup function
$cleanup = {
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Stop-Process -Name "aria2c" -Force -ErrorAction SilentlyContinue
    Write-Host "Done!" -ForegroundColor Green
    exit 0
}

# Register cleanup on Ctrl+C
Register-EngineEvent PowerShell.Exiting -Action $cleanup

# Start the server
Push-Location $SERVER_DIR
try {
    npm start
}
finally {
    Pop-Location
    & $cleanup
}
