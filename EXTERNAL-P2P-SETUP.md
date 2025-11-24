# 🌐 Dışarıdan Erişim için Private P2P Kurulumu

## Senaryo

```
Internet
   │
   ├─ Kullanıcı 1 (Evden, NAT arkası)
   ├─ Kullanıcı 2 (Ofisten, NAT arkası)  
   ├─ Kullanıcı 3 (Kafeden, NAT arkası)
   │
   └─ Sunucu (Dış IP: YOUR_PUBLIC_IP)
        ├─ Master Server (Port 3000)
        ├─ Aria2 RPC (Port 6800)
        └─ Tracker (Port 3000/announce)
```

## 🔧 Sunucu Kurulumu

### 1. Dış IP'nizi Öğrenin

```powershell
# Windows
curl ifconfig.me

# Veya
Invoke-RestMethod -Uri "https://api.ipify.org"
```

Diyelim ki: `203.0.113.50`

### 2. Port Forwarding (Router)

Router'ınızda şu portları açın:

| Port | Protokol | Servis | Hedef |
|------|----------|--------|-------|
| 3000 | TCP | Master Server + Tracker | Sunucu IP |
| 6800 | TCP | Aria2 RPC | Sunucu IP |
| 6881-6889 | TCP | BitTorrent P2P | Sunucu IP |
| 6881-6889 | UDP | BitTorrent DHT (kapalı ama açık tutun) | Sunucu IP |

### 3. Firewall Ayarları

```powershell
# Windows Firewall
New-NetFirewallRule -DisplayName "Master Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Aria2 RPC" -Direction Inbound -LocalPort 6800 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "BitTorrent TCP" -Direction Inbound -LocalPort 6881-6889 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "BitTorrent UDP" -Direction Inbound -LocalPort 6881-6889 -Protocol UDP -Action Allow
```

### 4. Aria2 Config Düzenleyin

`server/aria2-private.conf` dosyasını açın ve değiştirin:

```conf
# Dış IP'nizi yazın
bt-tracker=http://203.0.113.50:3000/announce
bt-external-ip=203.0.113.50
```

### 5. Aria2'yi Başlatın

```powershell
aria2c --conf-path="$PWD\aria2-private.conf"
```

### 6. Master Server'ı Başlatın

```powershell
cd server
npm start
```

---

## 👥 Kullanıcı Tarafı Kurulumu

### 1. Aria2 Kurulumu

Her kullanıcı kendi PC'sine aria2 kuracak:

```powershell
choco install aria2
```

### 2. Kullanıcı Aria2 Config

Her kullanıcı için `aria2-client.conf`:

```conf
# RPC
enable-rpc=true
rpc-listen-all=false
rpc-listen-port=6800

# İndirme
dir=C:\Downloads
max-concurrent-downloads=5

# P2P Ayarları
enable-dht=false
bt-enable-lpd=false
enable-peer-exchange=false

# SUNUCU TRACKER (Dış IP)
bt-tracker=http://203.0.113.50:3000/announce
bt-exclude-tracker=*

# NAT Traversal
listen-port=6881-6889
enable-upnp=true
enable-nat-pmp=true

# Performans
disk-cache=64M
max-connection-per-server=16
split=16
```

### 3. Kullanıcı Aria2'yi Başlatır

```powershell
aria2c --conf-path="aria2-client.conf"
```

### 4. Electron Uygulamasında Ayarlar

Aria2 Settings:
- **URL**: `http://localhost:6800/jsonrpc` (kendi local aria2'si)
- **Server URL**: `http://203.0.113.50:3000` (sunucu dış IP)

---

## 🔄 P2P Nasıl Çalışır?

### Adım 1: İlk İndirme
```
Kullanıcı 1 → Tracker'a announce eder
             → Sunucudan chunk'ları indirir
             → Seeding başlar
```

### Adım 2: İkinci Kullanıcı
```
Kullanıcı 2 → Tracker'a announce eder
             → Tracker: "Kullanıcı 1 ve Sunucu var" der
             → Hem sunucudan hem Kullanıcı 1'den indirir!
```

### Adım 3: Üçüncü Kullanıcı
```
Kullanıcı 3 → Tracker'a announce eder
             → Tracker: "Sunucu, Kullanıcı 1, Kullanıcı 2 var" der
             → 3 kaynaktan birden indirir! (Çok hızlı!)
```

---

## 🚀 NAT Traversal Stratejileri

### 1. UPnP (Otomatik)
Aria2 otomatik olarak router'da port açar:
```conf
enable-upnp=true
enable-nat-pmp=true
```

### 2. Manuel Port Forwarding
Kullanıcılar kendi router'larında `6881-6889` portlarını açarlar.

### 3. Relay (Sunucu Üzerinden)
NAT traversal başarısız olursa, sunucu relay görevi görür:
- Kullanıcı 1 → Sunucu → Kullanıcı 2

---

## 📊 Performans Beklentileri

### Senaryo: 10 GB Film

| Durum | Kullanıcı 1 | Kullanıcı 2 | Kullanıcı 3 |
|-------|-------------|-------------|-------------|
| **Sadece Sunucu** | 100 MB/s | 50 MB/s | 33 MB/s |
| **P2P Aktif** | 100 MB/s | 75 MB/s | 80 MB/s |

**P2P ile:**
- Kullanıcı 2: Sunucu (50%) + Kullanıcı 1 (50%)
- Kullanıcı 3: Sunucu (33%) + Kullanıcı 1 (33%) + Kullanıcı 2 (33%)

---

## 🔍 Test ve Doğrulama

### Sunucuda Test

```powershell
# Tracker stats
curl http://203.0.113.50:3000/tracker/stats

# Beklenen çıktı:
# {
#   "torrents": 1,
#   "totalPeers": 3,
#   "message": "Private P2P Tracker - Local Network Only"
# }
```

### Kullanıcıda Test

```powershell
# Aria2 RPC test
curl http://localhost:6800/jsonrpc -Method Post -Body '{"jsonrpc":"2.0","id":"test","method":"aria2.getGlobalStat"}' -ContentType "application/json"
```

---

## 🐛 Sorun Giderme

### Kullanıcılar Birbirini Görmüyor

**1. Tracker'ı kontrol edin:**
```powershell
curl http://203.0.113.50:3000/tracker/stats
```

**2. Aria2 loglarını kontrol edin:**
```powershell
# Sunucu
type C:\aria2-private.log

# Client
type C:\aria2.log
```

**3. Port forwarding kontrol:**
```powershell
# Dışarıdan test
Test-NetConnection -ComputerName 203.0.113.50 -Port 3000
Test-NetConnection -ComputerName 203.0.113.50 -Port 6800
```

### UPnP Çalışmıyor

Manuel port forwarding yapın:
1. Router admin paneline girin
2. Port Forwarding bölümüne gidin
3. `6881-6889` TCP/UDP → PC IP'niz

---

## 📝 Özet Checklist

### Sunucu:
- [ ] Dış IP öğrenildi
- [ ] Port forwarding yapıldı (3000, 6800, 6881-6889)
- [ ] Firewall açıldı
- [ ] `aria2-private.conf` düzenlendi (dış IP)
- [ ] Aria2 başlatıldı
- [ ] Master Server başlatıldı
- [ ] Tracker test edildi

### Her Kullanıcı:
- [ ] Aria2 kuruldu
- [ ] `aria2-client.conf` oluşturuldu (sunucu dış IP)
- [ ] Aria2 başlatıldı
- [ ] Electron uygulaması ayarlandı
- [ ] UPnP aktif VEYA manuel port forwarding yapıldı

---

## 🎯 Sonuç

Bu yapılandırma ile:
- ✅ Kullanıcılar dışarıdan bağlanır
- ✅ Tracker üzerinden birbirini bulur
- ✅ NAT traversal ile P2P bağlantı kurar
- ✅ Sunucu yükü azalır
- ✅ İndirme hızları artar

**Dış IP'niz nedir?** Ona göre config dosyalarını güncelleyeyim! 🚀
