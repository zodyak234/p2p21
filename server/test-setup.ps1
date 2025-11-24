# Aria2 + Master Server Test Script (PowerShell)
# Run this on your server (192.168.1.26)

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 Aria2 + Master Server Test Script" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if aria2c is installed
Write-Host "📦 Test 1: Checking aria2 installation..." -ForegroundColor Yellow
try {
    $aria2Version = & aria2c --version 2>&1 | Select-Object -First 1
    Write-Host "✓ aria2 is installed: $aria2Version" -ForegroundColor Green
} catch {
    Write-Host "✗ aria2 is NOT installed!" -ForegroundColor Red
    Write-Host "   Download from: https://github.com/aria2/aria2/releases" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Check if aria2 RPC is running
Write-Host "🔌 Test 2: Checking aria2 RPC connection..." -ForegroundColor Yellow
try {
    $testPayload = @{
        jsonrpc = "2.0"
        id = "test"
        method = "aria2.getVersion"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:6800/jsonrpc" -Method Post -Body $testPayload -ContentType "application/json" -ErrorAction Stop
    
    if ($response.result.version) {
        Write-Host "✓ Aria2 RPC is running on port 6800" -ForegroundColor Green
        Write-Host "   Version: $($response.result.version)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Aria2 RPC is NOT running!" -ForegroundColor Red
    Write-Host "   Start with: aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all=true" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Quick start command:" -ForegroundColor Cyan
    Write-Host "   aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all=true --dir=C:\Downloads" -ForegroundColor White
    exit 1
}
Write-Host ""

# Test 3: Check network interfaces
Write-Host "🌐 Test 3: Checking network interfaces..." -ForegroundColor Yellow
$networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
if ($networkAdapters) {
    Write-Host "✓ Network interfaces found:" -ForegroundColor Green
    foreach ($adapter in $networkAdapters) {
        Write-Host "   - $($adapter.IPAddress)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠ Could not detect network IP" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Check port availability
Write-Host "🔓 Test 4: Checking port availability..." -ForegroundColor Yellow

# Check port 3000 (Master Server)
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "⚠ Port 3000 is already in use" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port 3000 is available (Master Server)" -ForegroundColor Green
}

# Check port 6800 (Aria2 RPC)
$port6800 = Get-NetTCPConnection -LocalPort 6800 -ErrorAction SilentlyContinue
if ($port6800) {
    Write-Host "✓ Port 6800 is in use (Aria2 RPC)" -ForegroundColor Green
} else {
    Write-Host "⚠ Port 6800 is not in use (Aria2 RPC not running?)" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Check Node.js
Write-Host "📦 Test 5: Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is NOT installed!" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 6: Test aria2 RPC methods
Write-Host "🧪 Test 6: Testing aria2 RPC methods..." -ForegroundColor Yellow
try {
    $statsPayload = @{
        jsonrpc = "2.0"
        id = "stats"
        method = "aria2.getGlobalStat"
    } | ConvertTo-Json

    $statsResponse = Invoke-RestMethod -Uri "http://localhost:6800/jsonrpc" -Method Post -Body $statsPayload -ContentType "application/json"
    
    if ($statsResponse.result) {
        Write-Host "✓ aria2.getGlobalStat works" -ForegroundColor Green
        Write-Host "   Active downloads: $($statsResponse.result.numActive)" -ForegroundColor Gray
        
        $downloadSpeedMB = [math]::Round([int]$statsResponse.result.downloadSpeed / 1MB, 2)
        $uploadSpeedMB = [math]::Round([int]$statsResponse.result.uploadSpeed / 1MB, 2)
        
        Write-Host "   Download speed: $downloadSpeedMB MB/s" -ForegroundColor Gray
        Write-Host "   Upload speed: $uploadSpeedMB MB/s" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ aria2.getGlobalStat failed" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Aria2 is ready for use!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. cd server" -ForegroundColor White
Write-Host "2. npm install (if not done)" -ForegroundColor White
Write-Host "3. npm start" -ForegroundColor White
Write-Host ""
Write-Host "Aria2 RPC URL: http://localhost:6800/jsonrpc" -ForegroundColor Cyan
Write-Host "Master Server will run on: http://localhost:3000" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
