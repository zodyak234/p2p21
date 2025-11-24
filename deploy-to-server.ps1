# Deploy to Server Script
# Local PC'den sunucuya otomatik deployment

param(
    [string]$ServerIP = "192.168.1.26",
    [string]$ServerUser = "Administrator",
    [string]$ServerPath = "C:\p2p-video"
)

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Deploying to p2p.bbsgg.com Server" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project directory
if (-not (Test-Path "package.json")) {
    Write-Host "✗ Not in project directory!" -ForegroundColor Red
    exit 1
}

# Build client (optional)
Write-Host "📦 Building client..." -ForegroundColor Yellow
# npm run build

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "p2p-deploy-$timestamp.zip"

# Files to include
$filesToInclude = @(
    "server/*",
    "aria2-client-bbsgg.conf",
    "start-bbsgg.ps1",
    "PRODUCTION-SETUP-BBSGG.md",
    "package.json",
    "README.md"
)

# Create zip
Compress-Archive -Path $filesToInclude -DestinationPath $packageName -Force

Write-Host "✓ Package created: $packageName" -ForegroundColor Green
Write-Host ""

# Copy to server
Write-Host "📤 Copying to server..." -ForegroundColor Yellow
Write-Host "   Server: $ServerIP" -ForegroundColor Gray
Write-Host "   Path: $ServerPath" -ForegroundColor Gray
Write-Host ""

# Using SCP (requires OpenSSH)
# scp $packageName ${ServerUser}@${ServerIP}:${ServerPath}/

# Or using PowerShell Remoting
# Copy-Item -Path $packageName -Destination "\\$ServerIP\C$\p2p-video\" -Force

Write-Host "⚠️  Manual steps:" -ForegroundColor Yellow
Write-Host "   1. Copy $packageName to server" -ForegroundColor White
Write-Host "   2. Extract on server" -ForegroundColor White
Write-Host "   3. Run: cd server && npm install" -ForegroundColor White
Write-Host "   4. Restart services" -ForegroundColor White
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Deployment package ready!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
