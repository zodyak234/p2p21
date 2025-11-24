# Quick Start Script for Aria2 + Master Server
# This script starts both aria2 and the master server

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Starting Aria2 + Master Server" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ARIA2_DIR = "$env:USERPROFILE\Downloads"  # Change this to your preferred download directory
$ARIA2_PORT = 6800
$SERVER_PORT = 3000

# Check if aria2c is installed
Write-Host "📦 Checking aria2 installation..." -ForegroundColor Yellow
try {
    $null = & aria2c --version 2>&1
    Write-Host "✓ aria2 found" -ForegroundColor Green
} catch {
    Write-Host "✗ aria2 not found! Please install it first." -ForegroundColor Red
    Write-Host "   Download from: https://github.com/aria2/aria2/releases" -ForegroundColor Yellow
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
    } else {
        Write-Host "Using existing aria2 instance" -ForegroundColor Green
        $skipAria2 = $true
    }
}
Write-Host ""

# Start aria2 if not skipped
if (-not $skipAria2) {
    Write-Host "🚀 Starting aria2 RPC server..." -ForegroundColor Yellow
    Write-Host "   Port: $ARIA2_PORT" -ForegroundColor Gray
    Write-Host "   Download directory: $ARIA2_DIR" -ForegroundColor Gray
    
    # Create download directory if it doesn't exist
    if (-not (Test-Path $ARIA2_DIR)) {
        New-Item -ItemType Directory -Path $ARIA2_DIR -Force | Out-Null
    }
    
    # Start aria2 in background
    $aria2Args = @(
        "--enable-rpc",
        "--rpc-listen-all=true",
        "--rpc-allow-origin-all=true",
        "--rpc-listen-port=$ARIA2_PORT",
        "--dir=$ARIA2_DIR",
        "--max-connection-per-server=16",
        "--split=16",
        "--max-concurrent-downloads=10",
        "--continue=true",
        "--max-overall-upload-limit=100M",
        "--disk-cache=64M"
    )
    
    Start-Process -FilePath "aria2c" -ArgumentList $aria2Args -WindowStyle Hidden
    
    Write-Host "✓ aria2 started" -ForegroundColor Green
    Start-Sleep -Seconds 2
    
    # Test aria2 connection
    try {
        $testPayload = @{
            jsonrpc = "2.0"
            id = "test"
            method = "aria2.getVersion"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:$ARIA2_PORT/jsonrpc" -Method Post -Body $testPayload -ContentType "application/json" -ErrorAction Stop
        Write-Host "✓ aria2 RPC is responding (v$($response.result.version))" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to connect to aria2 RPC" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Start Master Server
Write-Host "🚀 Starting Master Server..." -ForegroundColor Yellow
Write-Host "   Port: $SERVER_PORT" -ForegroundColor Gray
Write-Host ""

# Check if we're in the server directory
if (-not (Test-Path "package.json")) {
    Write-Host "⚠ Not in server directory. Changing to server directory..." -ForegroundColor Yellow
    if (Test-Path "server") {
        Set-Location "server"
    } else {
        Write-Host "✗ Cannot find server directory!" -ForegroundColor Red
        exit 1
    }
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Starting services..." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Aria2 RPC:     http://localhost:$ARIA2_PORT/jsonrpc" -ForegroundColor Cyan
Write-Host "Master Server: http://localhost:$SERVER_PORT" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Start the server
npm start
