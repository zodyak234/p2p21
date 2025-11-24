# 🚀 Hızlı Başlangıç Kılavuzu

## Sunucu Tarafı (192.168.1.26)

### Otomatik Başlatma (Önerilen)

#### Windows:
```powershell
cd server
.\start.ps1
```

#### Linux/macOS:
```bash
cd server
chmod +x start.sh
./start.sh
```

Bu script otomatik olarak:
- ✅ Aria2'yi başlatır (port 6800)
- ✅ Master Server'ı başlatır (port 3000)
- ✅ Gerekli ayarları yapar
- ✅ Bağlantıları test eder

---

### Manuel Başlatma

#### 1. Aria2'yi Başlatın

**Windows:**
```powershell
aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all=true --dir=C:\Downloads
```

**Linux/macOS:**
```bash
aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all=true --dir=$HOME/Downloads
```

#### 2. Master Server'ı Başlatın

```bash
cd server
npm install  # İlk seferde
npm start
```

---

### Test Etme

#### Windows:
```powershell
.\test-setup.ps1
```

#### Linux/macOS:
```bash
chmod +x test-setup.sh
./test-setup.sh
```

---

## Client Tarafı (Kullanıcılar)

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Uygulamayı Başlatın
```bash
npm run dev
```

### 3. Ayarları Yapın

Uygulama açıldığında:

1. **Aria2 Settings** panelini açın
2. **Aria2 RPC URL**: `http://192.168.1.26:6800/jsonrpc`
3. **Test Connection** butonuna tıklayın
4. ✓ Başarılı mesajını görmelisiniz

### 4. Sunucuya Bağlanın

1. **Connect to Server** bölümünden
2. Server URL: `http://192.168.1.26:3000`
3. **Connect** butonuna tıklayın
4. Kullanıcı adı ve şifre ile giriş yapın

### 5. Film İzleyin!

1. Film listesinden bir film seçin
2. İndirme otomatik başlar
3. İndirme bitince MPV otomatik açılır

---

## Sorun Giderme

### Aria2'ye Bağlanamıyorum

**Kontrol edin:**
```bash
# Aria2 çalışıyor mu?
ps aux | grep aria2  # Linux/macOS
tasklist | findstr aria2  # Windows

# Port açık mı?
netstat -an | grep 6800  # Linux/macOS
netstat -an | findstr 6800  # Windows
```

**Çözüm:**
```bash
# Aria2'yi yeniden başlatın
pkill aria2c  # Linux/macOS
taskkill /F /IM aria2c.exe  # Windows

# Sonra tekrar başlatın
./start.sh  # Linux/macOS
.\start.ps1  # Windows
```

### Master Server'a Bağlanamıyorum

**Kontrol edin:**
```bash
# Server çalışıyor mu?
curl http://192.168.1.26:3000
```

**Çözüm:**
```bash
cd server
npm start
```

### İndirmeler Başlamıyor

**Kontrol edin:**
1. Aria2 çalışıyor mu? ✓
2. Master Server çalışıyor mu? ✓
3. Firewall portları açık mı? ✓

**Portlar:**
- 3000: Master Server
- 6800: Aria2 RPC
- 6881-6999: BitTorrent

---

## Performans İpuçları

### 1000 Mbit Upload için Optimal Ayarlar:

**Aria2 başlatırken:**
```bash
aria2c \
  --enable-rpc \
  --rpc-listen-all=true \
  --max-overall-upload-limit=100M \
  --max-upload-limit=50M \
  --max-concurrent-downloads=10 \
  --bt-max-peers=100 \
  --disk-cache=64M
```

### Beklenen Hızlar:

| Kullanıcı Sayısı | Kişi Başına Hız | Toplam |
|------------------|-----------------|--------|
| 1 kişi | ~100 MB/s | 100 MB/s |
| 5 kişi | ~20 MB/s | 100 MB/s |
| 10 kişi | ~10 MB/s | 100 MB/s |

**Örnek:** 10 GB film → 1 kişiye ~100 saniyede!

---

## Komutlar Özeti

### Başlatma
```bash
# Sunucu
cd server && ./start.sh  # veya start.ps1

# Client
npm run dev
```

### Durdurma
```bash
# Aria2
pkill aria2c  # Linux/macOS
taskkill /F /IM aria2c.exe  # Windows

# Master Server
Ctrl+C
```

### Test
```bash
./test-setup.sh  # veya test-setup.ps1
```

### Loglar
```bash
# Aria2 logs
tail -f /tmp/aria2.log  # Linux/macOS
type C:\Users\YourName\.aria2\aria2.log  # Windows

# Master Server logs
# Terminal'de görünür
```

---

## Hızlı Referans

| Servis | Port | URL |
|--------|------|-----|
| Master Server | 3000 | http://192.168.1.26:3000 |
| Aria2 RPC | 6800 | http://192.168.1.26:6800/jsonrpc |
| BitTorrent | 6881-6999 | - |

---

**Hazırsınız!** 🚀

Herhangi bir sorun olursa:
1. Test scriptini çalıştırın
2. Logları kontrol edin
3. Servisleri yeniden başlatın
