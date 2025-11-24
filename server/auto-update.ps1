# Auto-Update Script for Server
# Sunucuda çalışır, GitHub'dan otomatik güncelleme yapar

param(
    [string]$RepoUrl = "https://github.com/YOUR_USERNAME/p2p-video.git",
    [string]$Branch = "main"
)

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔄 Auto-Update from GitHub" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
try {
    $null = & git --version 2>&1
}
catch {
    Write-Host "✗ Git not installed!" -ForegroundColor Red
    Write-Host "   Install from: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Not a git repository. Initializing..." -ForegroundColor Yellow
    git init
    git remote add origin $RepoUrl
    git fetch
    git checkout -b $Branch origin/$Branch
}
else {
    Write-Host "📥 Pulling latest changes..." -ForegroundColor Yellow
    
    # Stash local changes
    git stash
    
    # Pull
    git pull origin $Branch
    
    # Check if there were updates
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Updated successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Update failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

# Server dependencies
if (Test-Path "server/package.json") {
    Push-Location server
    npm install
    Pop-Location
    Write-Host "✓ Server dependencies installed" -ForegroundColor Green
}

# Client dependencies (if needed)
if (Test-Path "package.json") {
    npm install
    Write-Host "✓ Client dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Update complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Restart services to apply changes:" -ForegroundColor Yellow
Write-Host "   1. Stop aria2 and master server" -ForegroundColor White
Write-Host "   2. Run: .\start-bbsgg.ps1" -ForegroundColor White
