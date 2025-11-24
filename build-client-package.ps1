# Build Client Package
# Kullanıcılara dağıtılacak client paketi oluşturur

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📦 Building Client Package" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project directory
if (-not (Test-Path "package.json")) {
    Write-Host "✗ Not in project directory!" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build Electron app
Write-Host "🔨 Building Electron app..." -ForegroundColor Yellow
npm run build

# Create distribution package
Write-Host "📦 Creating distribution package..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "p2p-bbsgg-client-$timestamp.zip"

# Files to include for users
$clientFiles = @(
    "dist/*",
    "aria2-client-bbsgg.conf",
    "README.md"
)

# Create user guide
$userGuide = @"
# p2p.bbsgg.com - Client Kurulum Kılavuzu

## Gereksinimler
1. Windows 10/11
2. Aria2 (otomatik kurulacak)

## Kurulum Adımları

### 1. Aria2 Kurulumu
PowerShell'i Administrator olarak açın:
``````powershell
choco install aria2
``````

### 2. Aria2 Başlatma
``````powershell
aria2c --conf-path="aria2-client-bbsgg.conf"
``````

### 3. Uygulama Başlatma
``````powershell
# dist klasöründeki .exe dosyasını çalıştırın
``````

### 4. Ayarlar
- Aria2 RPC URL: http://localhost:6800/jsonrpc
- Server URL: https://p2p.bbsgg.com

### 5. Giriş
Kullanıcı adı ve şifreniz ile giriş yapın.

## Sorun Giderme

### Aria2 çalışmıyor
``````powershell
# Port kontrolü
netstat -an | findstr :6800
``````

### Sunucuya bağlanamıyorum
``````powershell
# Bağlantı testi
curl https://p2p.bbsgg.com/health
``````

## Destek
Sorun yaşarsanız: support@bbsgg.com
"@

$userGuide | Out-File -FilePath "CLIENT-SETUP.md" -Encoding utf8

# Add to package
$clientFiles += "CLIENT-SETUP.md"

# Create zip
Compress-Archive -Path $clientFiles -DestinationPath $packageName -Force

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Client package created!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package: $packageName" -ForegroundColor Cyan
Write-Host ""
Write-Host "📤 Distribute to users:" -ForegroundColor Yellow
Write-Host "   1. Upload to file server" -ForegroundColor White
Write-Host "   2. Send download link" -ForegroundColor White
Write-Host "   3. Users extract and run setup" -ForegroundColor White
