# P2P Video Watch App - Aria2 Edition

Bu uygulama, WebTorrent yerine **aria2** kullanarak torrent indirmeleri yapan ve MPV ile video oynatma özelliğine sahip bir Electron uygulamasıdır.

## Özellikler

- ✅ **Aria2 Entegrasyonu**: WebTorrent yerine stabil aria2 download manager kullanımı
- ✅ **RPC Desteği**: Aria2'nin JSON-RPC API'si ile iletişim
- ✅ **İndirme Takibi**: Gerçek zamanlı indirme ilerlemesi ve hız gösterimi
- ✅ **MPV Entegrasyonu**: İndirilen videoların MPV ile otomatik oynatılması
- ✅ **Ayarlanabilir Yapılandırma**: Aria2 RPC URL, secret ve indirme dizini ayarları
- ✅ **Socket.IO Desteği**: Çoklu kullanıcı desteği için master server bağlantısı

## Gereksinimler

### 1. Aria2 Kurulumu

Aria2'nin sisteminizde kurulu ve çalışıyor olması gerekir.

**Windows:**
```powershell
# Chocolatey ile
choco install aria2

# Manuel kurulum
# https://github.com/aria2/aria2/releases adresinden indirin
```

**Linux:**
```bash
sudo apt install aria2  # Debian/Ubuntu
sudo yum install aria2  # CentOS/RHEL
```

**macOS:**
```bash
brew install aria2
```

### 2. Aria2 RPC Sunucusunu Başlatma

Aria2'yi RPC modu ile başlatın:

```bash
# Basit başlatma
aria2c --enable-rpc

# Secret token ile (önerilir)
aria2c --enable-rpc --rpc-secret=YOUR_SECRET_TOKEN

# Özel port ile
aria2c --enable-rpc --rpc-listen-port=6800

# İndirme dizini belirtme
aria2c --enable-rpc --dir=/path/to/downloads

# Tam örnek
aria2c --enable-rpc --rpc-secret=mytoken123 --dir=C:\Downloads --max-connection-per-server=16 --split=16
```

### 3. MPV Player

MPV player'ın kurulu olması gerekir (video oynatma için).

**Windows:**
- https://mpv.io/installation/ adresinden indirin
- `electron/main.ts` dosyasındaki MPV yolunu kendi sisteminize göre güncelleyin

**Linux/macOS:**
```bash
# Linux
sudo apt install mpv

# macOS
brew install mpv
```

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Uygulamayı geliştirme modunda çalıştırın:
```bash
npm run dev
```

## Kullanım

### 1. Aria2 Ayarları

Uygulama açıldığında "Aria2 Settings" bölümünden:
- **Aria2 RPC URL**: Aria2 sunucunuzun adresi (varsayılan: `http://localhost:6800/jsonrpc`)
- **RPC Secret**: Aria2'yi secret token ile başlattıysanız buraya girin
- **Download Directory**: İndirme dizinini belirtmek isterseniz (opsiyonel)

### 2. Sunucuya Bağlanma

"Connect to Server" bölümünden master server URL'ini girin ve bağlanın.

### 3. Video İndirme

1. Content Selector'dan bir film seçin veya magnet link girin
2. İndirme otomatik olarak aria2'ye gönderilir
3. İndirme ilerlemesi gerçek zamanlı olarak gösterilir
4. İndirme tamamlandığında video otomatik olarak MPV ile açılır

## Aria2 vs WebTorrent

### Neden Aria2?

| Özellik | Aria2 | WebTorrent |
|---------|-------|------------|
| **Stabilite** | ✅ Çok stabil | ⚠️ Bazen sorunlu |
| **Hız** | ✅ Çok hızlı | ⚠️ Değişken |
| **Kaynak Kullanımı** | ✅ Düşük | ⚠️ Yüksek |
| **Torrent Desteği** | ✅ Tam destek | ⚠️ Sınırlı |
| **HTTP/FTP** | ✅ Destekler | ❌ Desteklemez |
| **Çoklu Bağlantı** | ✅ Evet | ⚠️ Sınırlı |

### Avantajlar

- **Daha Stabil**: Aria2 production-ready bir download manager
- **Daha Hızlı**: Çoklu bağlantı ve segmentasyon desteği
- **Daha Az Kaynak**: Düşük CPU ve RAM kullanımı
- **Daha Fazla Özellik**: HTTP, FTP, BitTorrent, Metalink desteği
- **Merkezi Yönetim**: Tek bir aria2 instance birden fazla uygulama tarafından kullanılabilir

## Yapılandırma

### Aria2 Yapılandırma Dosyası

`~/.aria2/aria2.conf` dosyası oluşturarak aria2'yi yapılandırabilirsiniz:

```conf
# RPC Ayarları
enable-rpc=true
rpc-listen-port=6800
rpc-secret=YOUR_SECRET_HERE

# İndirme Ayarları
dir=/path/to/downloads
max-concurrent-downloads=5
max-connection-per-server=16
split=16
min-split-size=1M

# BitTorrent Ayarları
bt-max-peers=50
bt-request-peer-speed-limit=100K
seed-ratio=1.0
seed-time=60

# DHT
enable-dht=true
bt-enable-lpd=true
enable-peer-exchange=true
```

### Electron Main Process

`electron/main.ts` dosyasında aria2 ayarlarını değiştirebilirsiniz:

```typescript
let aria2Config: Aria2Config = {
    url: 'http://localhost:6800/jsonrpc',
    secret: 'YOUR_SECRET',
    downloadDir: 'C:\\Downloads'
};
```

## API Referansı

### IPC Handlers

- `start-stream`: Magnet URI ile indirme başlatır
- `get-aria2-config`: Mevcut aria2 ayarlarını getirir
- `update-aria2-config`: Aria2 ayarlarını günceller
- `get-download-status`: Belirli bir indirmenin durumunu getirir
- `remove-download`: İndirmeyi iptal eder
- `play-with-mpv`: Dosyayı MPV ile oynatır

### Events

- `download-progress`: İndirme ilerlemesi güncellemeleri
- `download-complete`: İndirme tamamlandı
- `download-error`: İndirme hatası

## Sorun Giderme

### Aria2'ye Bağlanamıyorum

1. Aria2'nin çalıştığından emin olun:
```bash
# Windows
tasklist | findstr aria2

# Linux/macOS
ps aux | grep aria2
```

2. RPC portunu kontrol edin:
```bash
netstat -an | findstr 6800
```

3. Firewall ayarlarını kontrol edin

### İndirmeler Başlamıyor

1. Aria2 loglarını kontrol edin
2. Magnet URI'nin geçerli olduğundan emin olun
3. DHT ve tracker'ların çalıştığından emin olun

### MPV Açılmıyor

1. MPV'nin kurulu olduğundan emin olun
2. `electron/main.ts` dosyasındaki MPV yolunu kontrol edin
3. Dosya yolunun doğru olduğundan emin olun

## Geliştirme

```bash
# Geliştirme modu
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## Lisans

MIT

## Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır!
