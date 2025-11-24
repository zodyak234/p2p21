# 🚀 p2p.bbsgg.com - Kurulum Kılavuzu

## 📋 Sistem Bilgileri

- **Domain**: `p2p.bbsgg.com`
- **Dış IP**: `92.44.80.248`
- **Sunucu Local IP**: `192.168.1.26`
- **Nginx Proxy Manager**: Mevcut

---

## 🔧 Sunucu Kurulumu (192.168.1.26)

### 1️⃣ Nginx Proxy Manager Ayarları

**Proxy Hosts → Add Proxy Host**

#### Details Tab:
```
Domain Names: p2p.bbsgg.com
Scheme: http
Forward Hostname/IP: 192.168.1.26
Forward Port: 3000
Cache Assets: ❌ OFF
Block Common Exploits: ✅ ON
Websockets Support: ✅ ON
```

#### SSL Tab:
```
✅ Force SSL
✅ HTTP/2 Support
✅ HSTS Enabled
SSL Certificate: Request a new SSL Certificate with Let's Encrypt
Email: your-email@example.com
✅ I Agree to the Let's Encrypt Terms of Service
```

#### Advanced Tab:
```nginx
# Tracker endpoints
location /announce {
    proxy_pass http://192.168.1.26:3000/announce;
    proxy_buffering off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /scrape {
    proxy_pass http://192.168.1.26:3000/scrape;
    proxy_buffering off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /tracker/stats {
    proxy_pass http://192.168.1.26:3000/tracker/stats;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Socket.IO için
location /socket.io/ {
    proxy_pass http://192.168.1.26:3000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Save** butonuna tıklayın!

---

### 2️⃣ Firewall Ayarları (Windows Server)

```powershell
# PowerShell'i Administrator olarak açın

# Master Server (local only)
New-NetFirewallRule -DisplayName "P2P Master Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Aria2 RPC (local only)
New-NetFirewallRule -DisplayName "P2P Aria2 RPC" -Direction Inbound -LocalPort 6800 -Protocol TCP -Action Allow

# BitTorrent P2P (dışarıya açık - ÖNEMLİ!)
New-NetFirewallRule -DisplayName "P2P BitTorrent TCP" -Direction Inbound -LocalPort 6881-6889 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "P2P BitTorrent UDP" -Direction Inbound -LocalPort 6881-6889 -Protocol UDP -Action Allow
```

---

### 3️⃣ Router Port Forwarding

Router admin panelinde şu portları açın:

| Port Range | Protocol | Destination IP | Açıklama |
|------------|----------|----------------|----------|
| 6881-6889 | TCP | 192.168.1.26 | BitTorrent P2P |
| 6881-6889 | UDP | 192.168.1.26 | BitTorrent DHT (kapalı ama açık tutun) |

**Not:** 80/443 portları zaten Nginx Proxy Manager'da açık olmalı.

---

### 4️⃣ Aria2 Başlatma

```powershell
cd "C:\Users\Main PC\.gemini\antigravity\playground\volatile-stellar\server"

# Aria2'yi başlat
aria2c --conf-path="aria2-bbsgg.conf"
```

**Beklenen çıktı:**
```
11/24 21:10:00 [NOTICE] IPv4 RPC: listening on TCP port 6800
11/24 21:10:00 [NOTICE] IPv4 BitTorrent: listening on TCP port 6881-6889
```

---

### 5️⃣ Master Server Başlatma

**Yeni bir PowerShell penceresi açın:**

```powershell
cd "C:\Users\Main PC\.gemini\antigravity\playground\volatile-stellar\server"

# Bağımlılıkları kur (ilk seferde)
npm install

# Server'ı başlat
npm start
```

**Beklenen çıktı:**
```
═══════════════════════════════════════════════════════
🚀 Master Server (Aria2 Edition) Started!
═══════════════════════════════════════════════════════
📡 Local:   http://localhost:3000
🌐 Network: http://192.168.1.26:3000
───────────────────────────────────────────────────────
✓ Connected to Aria2 RPC
  Version: 1.36.0
═══════════════════════════════════════════════════════
```

---

### 6️⃣ Test

**Başka bir PowerShell'de:**

```powershell
# Tracker test (HTTPS üzerinden)
curl https://p2p.bbsgg.com/tracker/stats

# Beklenen çıktı:
# {
#   "torrents": 0,
#   "totalPeers": 0,
#   "message": "Private P2P Tracker - Local Network Only"
# }

# Master server test
curl https://p2p.bbsgg.com/health

# Beklenen: OK
```

---

## 👥 Client Kurulumu (Her Kullanıcı)

### 1️⃣ Aria2 Kurulumu

```powershell
# Chocolatey ile
choco install aria2

# Veya manuel: https://github.com/aria2/aria2/releases
```

---

### 2️⃣ Aria2 Config Dosyası

**`aria2-client-bbsgg.conf` dosyasını indirin** (proje root'unda hazır)

Veya manuel oluşturun:

```powershell
# Config dosyası oluştur
notepad aria2-client.conf
```

İçeriği `aria2-client-bbsgg.conf` dosyasından kopyalayın.

---

### 3️⃣ Aria2 Başlatma (Client)

```powershell
# Config dosyasının olduğu dizinde
aria2c --conf-path="aria2-client.conf"
```

**Beklenen:**
```
IPv4 RPC: listening on TCP port 6800
```

---

### 4️⃣ Electron Uygulaması

```powershell
cd "C:\Users\Main PC\.gemini\antigravity\playground\volatile-stellar"

# Bağımlılıkları kur (ilk seferde)
npm install

# Uygulamayı başlat
npm run dev
```

---

### 5️⃣ Uygulama Ayarları

Uygulama açıldığında:

#### Aria2 Settings:
```
Aria2 RPC URL: http://localhost:6800/jsonrpc
RPC Secret: (boş bırakın)
Download Directory: (boş bırakın)
```

**Test Connection** → ✅ Başarılı olmalı

#### Server Connection:
```
Server URL: https://p2p.bbsgg.com
```

**Connect** → Kullanıcı adı/şifre ile giriş yapın

---

## 🧪 Tam Test Senaryosu

### Sunucuda:

```powershell
# 1. Aria2 çalışıyor mu?
netstat -an | findstr :6800
# Beklenen: LISTENING

# 2. Master Server çalışıyor mu?
netstat -an | findstr :3000
# Beklenen: LISTENING

# 3. Tracker test
curl https://p2p.bbsgg.com/tracker/stats

# 4. Aria2 RPC test
curl http://localhost:6800/jsonrpc -Method Post -Body '{"jsonrpc":"2.0","id":"test","method":"aria2.getVersion"}' -ContentType "application/json"
```

### Client'ta:

```powershell
# 1. Local aria2 çalışıyor mu?
netstat -an | findstr :6800

# 2. Tracker'a erişim var mı?
curl https://p2p.bbsgg.com/tracker/stats

# 3. Server'a erişim var mı?
curl https://p2p.bbsgg.com/health
```

---

## 📊 URL'ler

| Servis | URL | Açıklama |
|--------|-----|----------|
| **Master Server** | https://p2p.bbsgg.com | Ana uygulama |
| **Tracker Announce** | https://p2p.bbsgg.com/announce | BitTorrent tracker |
| **Tracker Scrape** | https://p2p.bbsgg.com/scrape | Torrent istatistikleri |
| **Tracker Stats** | https://p2p.bbsgg.com/tracker/stats | Tracker durumu |
| **Health Check** | https://p2p.bbsgg.com/health | Sunucu sağlık kontrolü |

---

## 🔄 P2P Nasıl Çalışır?

### Senaryo: 3 Kullanıcı, 10 GB Film

**1. Kullanıcı 1 film seçer:**
```
Kullanıcı 1 → p2p.bbsgg.com → Magnet link alır
Kullanıcı 1 → Tracker'a announce eder
Tracker → "Sunucu (92.44.80.248) var" der
Kullanıcı 1 → Sunucudan indirir (100 MB/s)
Kullanıcı 1 → Seeding başlar
```

**2. Kullanıcı 2 aynı filmi seçer:**
```
Kullanıcı 2 → Tracker'a announce eder
Tracker → "Sunucu + Kullanıcı 1 var" der
Kullanıcı 2 → Hem sunucudan (50 MB/s) hem Kullanıcı 1'den (50 MB/s) indirir
Toplam: 100 MB/s! 🚀
```

**3. Kullanıcı 3 aynı filmi seçer:**
```
Kullanıcı 3 → Tracker'a announce eder
Tracker → "Sunucu + Kullanıcı 1 + Kullanıcı 2 var" der
Kullanıcı 3 → 3 kaynaktan birden indirir!
Toplam: 120+ MB/s! 🔥
```

---

## 🐛 Sorun Giderme

### "Tracker'a bağlanamıyorum"

```powershell
# DNS kontrolü
nslookup p2p.bbsgg.com

# HTTPS kontrolü
curl https://p2p.bbsgg.com/tracker/stats

# Firewall kontrolü
Test-NetConnection -ComputerName p2p.bbsgg.com -Port 443
```

### "Peer bulamıyorum"

```powershell
# Tracker stats kontrol
curl https://p2p.bbsgg.com/tracker/stats

# Aria2 log kontrol
type C:\aria2-bbsgg.log  # Sunucu
type aria2-client.log     # Client
```

### "Port forwarding çalışmıyor"

```powershell
# Dışarıdan test (başka bir PC'den)
Test-NetConnection -ComputerName 92.44.80.248 -Port 6881
```

---

## ✅ Checklist

### Sunucu:
- [ ] Nginx Proxy Manager'da `p2p.bbsgg.com` eklendi
- [ ] SSL sertifikası alındı (Let's Encrypt)
- [ ] Advanced config eklendi (tracker endpoints)
- [ ] Firewall kuralları eklendi
- [ ] Router port forwarding yapıldı (6881-6889)
- [ ] Aria2 başlatıldı (`aria2-bbsgg.conf`)
- [ ] Master Server başlatıldı
- [ ] Test edildi (`curl https://p2p.bbsgg.com/tracker/stats`)

### Her Client:
- [ ] Aria2 kuruldu
- [ ] `aria2-client-bbsgg.conf` indirildi
- [ ] Aria2 başlatıldı
- [ ] Electron uygulaması başlatıldı
- [ ] Aria2 Settings: `http://localhost:6800/jsonrpc`
- [ ] Server: `https://p2p.bbsgg.com`
- [ ] Test edildi

---

## 🎯 Sonuç

Artık **p2p.bbsgg.com** üzerinden:
- ✅ HTTPS ile güvenli bağlantı
- ✅ Private P2P ağı (sadece sizin kullanıcılarınız)
- ✅ 1000 Mbit upload optimize edilmiş
- ✅ Kullanıcılar birbirinden indirir
- ✅ Sunucu yükü azalır

**Hazırsınız!** 🚀
