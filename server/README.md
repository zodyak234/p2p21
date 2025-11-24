# P2P Video Watch - Master Server (Aria2 Edition)

WebTorrent yerine **Aria2** kullanan yüksek performanslı dosya paylaşım sunucusu.

## 🚀 Özellikler

- ✅ **Aria2 Entegrasyonu**: WebTorrent yerine aria2 ile dosya dağıtımı
- ✅ **Yüksek Hız**: 1000 Mbit upload ile maksimum performans
- ✅ **Çoklu Kullanıcı**: 6-7 kişiye aynı anda hizmet
- ✅ **Jellyfin Entegrasyonu**: Medya kütüphanesinden otomatik film listesi
- ✅ **Socket.IO**: Gerçek zamanlı iletişim
- ✅ **Kullanıcı Yönetimi**: Kayıt/Giriş sistemi

## 📋 Gereksinimler

### 1. Node.js
```bash
node --version  # v18 veya üzeri
```

### 2. Aria2
```bash
aria2c --version
```

Kurulum:
```bash
# Ubuntu/Debian
sudo apt install aria2

# CentOS/RHEL
sudo yum install aria2

# macOS
brew install aria2
```

### 3. Jellyfin (Opsiyonel)
Medya sunucunuz varsa API key'i ayarlayın.

## 🛠️ Kurulum

### 1. Bağımlılıkları Yükleyin
```bash
cd server
npm install
```

### 2. Aria2 Yapılandırması

**Aria2 config dosyası oluşturun:**
```bash
mkdir -p ~/.aria2
nano ~/.aria2/aria2.conf
```

**`aria2.conf` içeriği:**
```conf
# RPC Ayarları
enable-rpc=true
rpc-listen-all=true
rpc-allow-origin-all=true
rpc-listen-port=6800
# rpc-secret=YOUR_SECRET  # İsterseniz ekleyin

# İndirme Ayarları
dir=/path/to/shared/files  # Jellyfin dosyalarınızın olduğu yer
max-concurrent-downloads=10
max-connection-per-server=16
split=16
min-split-size=1M

# Upload Optimizasyonu (1000 Mbit için)
max-overall-upload-limit=100M  # 100 MB/s = 800 Mbit/s
max-upload-limit=50M           # Dosya başına 50 MB/s

# BitTorrent Ayarları
bt-max-peers=100
seed-ratio=0.0  # Sınırsız seeding
seed-time=0     # Sınırsız seeding
bt-enable-lpd=true
enable-dht=true
enable-peer-exchange=true

# Disk Cache (Hız için)
disk-cache=64M
file-allocation=falloc

# Logging
log=/var/log/aria2.log
log-level=notice
```

### 3. Jellyfin Ayarları (Opsiyonel)

`server/index.ts` dosyasında:
```typescript
const JELLYFIN_URL = 'http://localhost:8096';
const JELLYFIN_API_KEY = 'YOUR_API_KEY_HERE';
const JELLYFIN_USER_ID = 'YOUR_USER_ID';
```

Jellyfin API Key almak için:
1. Jellyfin Dashboard → API Keys
2. Yeni key oluşturun
3. Key'i kopyalayın

### 4. Aria2 RPC Ayarları

`server/index.ts` dosyasında:
```typescript
const ARIA2_RPC_URL = 'http://localhost:6800/jsonrpc';
const ARIA2_SECRET = ''; // RPC secret varsa buraya
```

## 🚀 Başlatma

### 1. Aria2'yi Başlatın
```bash
# Config dosyası ile
aria2c --conf-path=~/.aria2/aria2.conf

# Veya direkt komut ile
aria2c --enable-rpc --rpc-listen-all=true --dir=/path/to/files
```

### 2. Master Server'ı Başlatın
```bash
# Geliştirme modu (otomatik yeniden başlatma)
npm run dev

# Production modu
npm start
```

## 🔧 Systemd Servisi (Linux - Otomatik Başlatma)

### Aria2 Servisi
```bash
sudo nano /etc/systemd/system/aria2.service
```

```ini
[Unit]
Description=Aria2 Download Manager
After=network.target

[Service]
Type=simple
User=youruser
ExecStart=/usr/bin/aria2c --conf-path=/home/youruser/.aria2/aria2.conf
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Master Server Servisi
```bash
sudo nano /etc/systemd/system/p2p-master.service
```

```ini
[Unit]
Description=P2P Video Master Server
After=network.target aria2.service
Requires=aria2.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/server
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Servisleri Etkinleştirin:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable aria2
sudo systemctl enable p2p-master
sudo systemctl start aria2
sudo systemctl start p2p-master

# Durumu kontrol edin
sudo systemctl status aria2
sudo systemctl status p2p-master
```

## 🌐 Firewall Ayarları

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 3000/tcp  # Master Server
sudo ufw allow 6800/tcp  # Aria2 RPC
sudo ufw allow 6881:6999/tcp  # DHT/BitTorrent

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=6800/tcp
sudo firewall-cmd --permanent --add-port=6881-6999/tcp
sudo firewall-cmd --reload
```

## 📊 Performans Optimizasyonu

### 1000 Mbit Upload için Önerilen Ayarlar:

```conf
# aria2.conf
max-overall-upload-limit=100M      # 100 MB/s = 800 Mbit/s
max-upload-limit=50M               # Dosya başına
max-concurrent-downloads=10        # Aynı anda 10 dosya
bt-max-peers=100                   # Peer başına
disk-cache=64M                     # RAM cache
```

### Sistem Optimizasyonu:

```bash
# Açık dosya limiti artırın
sudo nano /etc/security/limits.conf
```

Ekleyin:
```
* soft nofile 65536
* hard nofile 65536
```

## 🔍 Test ve Doğrulama

### Aria2 Bağlantısını Test Edin:
```bash
curl http://localhost:6800/jsonrpc -d '{
  "jsonrpc":"2.0",
  "id":"test",
  "method":"aria2.getVersion"
}'
```

### Master Server Test:
```bash
curl http://localhost:3000
```

### Logları İzleyin:
```bash
# Aria2 logs
tail -f /var/log/aria2.log

# Master Server logs
sudo journalctl -u p2p-master -f
```

## 📈 Monitoring

### Aria2 İstatistikleri:
```bash
# Global stats
curl http://localhost:6800/jsonrpc -d '{
  "jsonrpc":"2.0",
  "id":"stats",
  "method":"aria2.getGlobalStat"
}'
```

### Aktif İndirmeler:
```bash
curl http://localhost:6800/jsonrpc -d '{
  "jsonrpc":"2.0",
  "id":"active",
  "method":"aria2.tellActive"
}'
```

## 🐛 Sorun Giderme

### Aria2 Bağlanamıyor:
```bash
# Aria2 çalışıyor mu?
ps aux | grep aria2

# Port açık mı?
netstat -tulpn | grep 6800

# Logları kontrol edin
tail -f /var/log/aria2.log
```

### Master Server Başlamıyor:
```bash
# Logları kontrol edin
sudo journalctl -u p2p-master -n 50

# Manuel başlatıp hataları görün
cd server
npm start
```

### Dosyalar Paylaşılmıyor:
1. Jellyfin API key'i doğru mu?
2. Dosya yolları erişilebilir mi?
3. Aria2 RPC çalışıyor mu?

## 📝 Notlar

- **WebTorrent Tamamen Kaldırıldı**: Artık sadece aria2 kullanılıyor
- **Yüksek Performans**: 1000 Mbit upload ile optimize edildi
- **Çoklu Kullanıcı**: 6-7 kişiye aynı anda hizmet verebilir
- **HTTP/HTTPS**: Torrent yerine HTTP üzerinden dağıtım (daha hızlı)

## 🔐 Güvenlik

Üretim ortamında:
1. Aria2 RPC secret kullanın
2. Firewall kurallarını sıkılaştırın
3. HTTPS kullanın
4. Güçlü şifreler kullanın

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. Aria2 bağlantısını test edin
3. Firewall ayarlarını kontrol edin

---

**Hazır!** Artık sunucunuz aria2 ile yüksek hızda dosya dağıtımı yapıyor! 🚀
