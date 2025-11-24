# 🎯 Nginx Proxy Manager ile Kurulum

## Nginx Proxy Manager Nedir?

Web tabanlı Nginx yönetim aracı. GUI üzerinden:
- ✅ Domain/subdomain yönetimi
- ✅ SSL sertifikası (Let's Encrypt otomatik)
- ✅ Reverse proxy ayarları
- ✅ WebSocket desteği

## 📋 Gerekli Proxy Host'lar

Nginx Proxy Manager'da **3 adet Proxy Host** oluşturacaksınız:

### 1️⃣ Master Server (Ana Uygulama)

**Nginx Proxy Manager → Proxy Hosts → Add Proxy Host**

| Alan | Değer |
|------|-------|
| **Domain Names** | `p2p.your-domain.com` |
| **Scheme** | `http` |
| **Forward Hostname/IP** | `192.168.1.26` (sunucu local IP) |
| **Forward Port** | `3000` |
| **Cache Assets** | ❌ Kapalı |
| **Block Common Exploits** | ✅ Açık |
| **Websockets Support** | ✅ **AÇIK** (Socket.IO için) |

**SSL Tab:**
- ✅ Force SSL
- ✅ HTTP/2 Support
- ✅ HSTS Enabled
- SSL Certificate: Request a new SSL Certificate (Let's Encrypt)

**Advanced Tab:**
```nginx
# Tracker endpoints için
location /announce {
    proxy_pass http://192.168.1.26:3000/announce;
    proxy_buffering off;
}

location /scrape {
    proxy_pass http://192.168.1.26:3000/scrape;
    proxy_buffering off;
}

location /tracker/stats {
    proxy_pass http://192.168.1.26:3000/tracker/stats;
}
```

---

### 2️⃣ Aria2 RPC (Opsiyonel - Dışarıdan erişim isterseniz)

**Nginx Proxy Manager → Proxy Hosts → Add Proxy Host**

| Alan | Değer |
|------|-------|
| **Domain Names** | `aria2.your-domain.com` |
| **Scheme** | `http` |
| **Forward Hostname/IP** | `192.168.1.26` |
| **Forward Port** | `6800` |
| **Websockets Support** | ✅ **AÇIK** |

**SSL Tab:**
- ✅ Force SSL
- ✅ Request new SSL Certificate

**Advanced Tab:**
```nginx
location /jsonrpc {
    proxy_pass http://192.168.1.26:6800/jsonrpc;
    proxy_buffering off;
    proxy_cache off;
}
```

---

## 🔧 Aria2 Config (Nginx Proxy Manager için)

Sadece **tracker URL'ini** güncelleyin:

**`server/aria2-nginx.conf` dosyasında:**

```conf
# Tracker URL (HTTPS - Nginx Proxy Manager üzerinden)
bt-tracker=https://p2p.your-domain.com/announce

# Dış IP (Nginx Proxy Manager sunucunuzun IP'si)
bt-external-ip=YOUR_PUBLIC_IP
```

**Diğer her şey aynı kalır!**

---

## 🚀 Kurulum Adımları

### Sunucuda (192.168.1.26):

**1. Aria2 Config'i düzenleyin:**
```powershell
cd server
notepad aria2-nginx.conf
```

Değiştirin:
- `bt-tracker=https://p2p.your-domain.com/announce`
- `bt-external-ip=YOUR_PUBLIC_IP`

**2. Aria2'yi başlatın:**
```powershell
aria2c --conf-path="aria2-nginx.conf"
```

**3. Master Server'ı başlatın:**
```powershell
npm start
```

---

### Nginx Proxy Manager'da:

**1. Proxy Host ekleyin:**
- Domain: `p2p.your-domain.com`
- Forward to: `192.168.1.26:3000`
- WebSockets: ✅ ON
- SSL: Let's Encrypt

**2. Advanced config ekleyin** (tracker endpoints için)

**3. Save!**

---

### Firewall (Sunucu):

Sadece **local portları** açın (Nginx Proxy Manager zaten dışarıya açık):

```powershell
# Master Server (sadece local)
New-NetFirewallRule -DisplayName "Master Server Local" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Aria2 RPC (sadece local)
New-NetFirewallRule -DisplayName "Aria2 RPC Local" -Direction Inbound -LocalPort 6800 -Protocol TCP -Action Allow

# BitTorrent P2P (dışarıya açık olmalı!)
New-NetFirewallRule -DisplayName "BitTorrent P2P" -Direction Inbound -LocalPort 6881-6889 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "BitTorrent P2P UDP" -Direction Inbound -LocalPort 6881-6889 -Protocol UDP -Action Allow
```

---

### Router Port Forwarding:

**Sadece BitTorrent portları** açın (Nginx Proxy Manager zaten 80/443'ü yönetiyor):

| Port | Protokol | Hedef |
|------|----------|-------|
| 6881-6889 | TCP | 192.168.1.26 |
| 6881-6889 | UDP | 192.168.1.26 |

---

## 👥 Client Tarafı

Her kullanıcı için `aria2-client.conf`:

```conf
# RPC (kendi local aria2'si)
enable-rpc=true
rpc-listen-port=6800

# İndirme
dir=C:\Downloads

# P2P Ayarları
enable-dht=false
bt-enable-lpd=false
enable-peer-exchange=false

# Tracker (HTTPS - Nginx Proxy Manager üzerinden)
bt-tracker=https://p2p.your-domain.com/announce
bt-exclude-tracker=*

# NAT Traversal
listen-port=6881-6889
enable-upnp=true

# Performans
disk-cache=64M
max-connection-per-server=16
```

---

## 🧪 Test

### 1. Master Server Test:
```powershell
curl https://p2p.your-domain.com/health
```

### 2. Tracker Test:
```powershell
curl https://p2p.your-domain.com/tracker/stats
```

Beklenen:
```json
{
  "torrents": 0,
  "totalPeers": 0,
  "message": "Private P2P Tracker - Local Network Only"
}
```

### 3. WebSocket Test (Socket.IO):
Browser'da: `https://p2p.your-domain.com`

Console'da:
```javascript
// Socket.IO bağlantısı olmalı
```

---

## 📊 URL Yapısı

| Servis | URL | Açıklama |
|--------|-----|----------|
| **Master Server** | `https://p2p.your-domain.com` | Ana uygulama |
| **Tracker Announce** | `https://p2p.your-domain.com/announce` | BitTorrent tracker |
| **Tracker Scrape** | `https://p2p.your-domain.com/scrape` | Torrent stats |
| **Tracker Stats** | `https://p2p.your-domain.com/tracker/stats` | Tracker istatistikleri |
| **Aria2 RPC** | `https://aria2.your-domain.com/jsonrpc` | (Opsiyonel) |

---

## ✅ Avantajlar

| Özellik | Nginx Proxy Manager ile |
|---------|-------------------------|
| **SSL/HTTPS** | ✅ Otomatik (Let's Encrypt) |
| **WebSocket** | ✅ Tek tık |
| **Domain** | ✅ Kolay yönetim |
| **Port Yönetimi** | ✅ Sadece 80/443 |
| **GUI** | ✅ Web tabanlı |

---

## 🎯 Özet

1. **Nginx Proxy Manager'da** → Proxy Host ekle (`p2p.your-domain.com` → `192.168.1.26:3000`)
2. **WebSockets** → ON
3. **SSL** → Let's Encrypt
4. **Advanced** → Tracker endpoints ekle
5. **Aria2 Config** → Tracker URL'yi güncelle (`https://p2p.your-domain.com/announce`)
6. **Başlat** → Aria2 + Master Server
7. **Test** → `curl https://p2p.your-domain.com/tracker/stats`

---

**Domain'iniz nedir?** Ona göre config'leri hazırlayayım! 🚀

Örnek: `p2p.example.com` → Tüm config'lerde `your-domain.com` yerine yazacağım.
