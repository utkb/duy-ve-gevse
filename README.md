# Duy ve Gevşe

Kronik boyun ağrısı olan bireyler için gevşeme egzersizi ve uyku
günlüğü PWA uygulaması. Balıkesir Üniversitesi Fizyoterapi ve
Rehabilitasyon Bölümü'nde yürütülen randomize kontrollü çalışmanın
parçasıdır.

![Kod](https://img.shields.io/badge/Kod-EUPL%201.2-blue)
![Ses](https://img.shields.io/badge/Ses-CC%20BY--NC--SA%204.0-orange)
![İçerik](https://img.shields.io/badge/İçerik-CC%20BY--SA%204.0-green)
![PWA](https://img.shields.io/badge/PWA-✓-purple)

**Canlı uygulama:** <https://utkb.github.io/duy-ve-gevse/>

---

## Bağlam

Mitchell'in fizyolojik gevşeme tekniğinden uyarlanmış 8 haftalık bir
müdahale protokolünün katılımcı yüzü. Uygulama; sesli rehber, Consensus
Sleep Diary (CSD) Türkçe uyarlaması ve egzersiz oturum takibi sağlar.

- **Hedef popülasyon:** Kronik boyun ağrılı yetişkinler (PUKİ > 5)
- **Çalışma takvimi:** 7 gün başlangıç + 8 hafta müdahale + 4 hafta takip
- **Veri toplama:** Yerel `localStorage`, haftalık Web Share API ile dışa aktarım
- **Katılımcı kodu sistemi:** `BAL-042` formatında, PII yok

---

## Teknik yapı

| Özellik | Detay |
|---------|-------|
| Mimari | Tek HTML dosyası, vanilla HTML/CSS/JS |
| Bağımlılık | Chart.js 4.4.1 (CDN), IBM Plex Sans/Mono (Google Fonts) |
| Veri depolama | `localStorage` + in-memory fallback |
| Backend | Yok |
| Offline | Service Worker (`sw.js`) — stale-while-revalidate / cache-first |
| Ses yönetimi | `ses/manifest.json` ile dinamik sürüm seçici |
| PWA | Manifest + ikon seti + iOS safe area |
| Dağıtım | GitHub Pages + QR kod |

---

## Uygulama yapısı

5 sekme:

1. **Ön Hazırlık** — 7 bölge için hareket kartları (görseller)
2. **Sesli Rehber** — Sürüm seçici + egzersiz oturum kaydı
3. **Günlük** — CSD Türkçe formu, 4 dönem saat seçici
4. **Grafik** — Çalışma fazı takibi + grafikler + haftalık paylaşım
5. **Hakkında** — Uygulama bilgisi, lisans, atıf

---

## Kullanım

### Katılımcı için

1. QR kod ile uygulamayı aç
2. Onam onayını ver, katılımcı kodunu gir (örn. `BAL-042`)
3. Safari/Chrome'da: Paylaş menüsü → **Ana Ekrana Ekle**
4. Günlük egzersiz + her sabah uyku günlüğü
5. Her Pazar: Grafik sekmesinden haftalık veri paylaşımı

### URL parametresi ile otomatik giriş

Katılımcı kodu URL üzerinden iletilebilir:

```
https://utkb.github.io/duy-ve-gevse/?k=BAL-042
```

---

## Dosya yapısı

```
duy-ve-gevse/
├── index.html              ana uygulama (~1824 satır)
├── sw.js                   Service Worker
├── manifest.json           PWA manifest
├── icon-*.png              uygulama ikonları
├── ses/
│   ├── manifest.json       sürüm listesi (dinamik)
│   ├── tam.mp3             ~24 dk tam sürüm
│   └── masa.mp3            ~12 dk masa başı sürümü
├── gorseller/              egzersiz GIF/PNG'leri
├── LICENSE                 EUPL 1.2 (İngilizce)
├── LICENSE.tr              EUPL 1.2 (Türkçe)
├── LICENSE-CONTENT.md      içerik lisansları
└── README.md
```

---

## Yeni ses sürümü ekleme

HTML'e dokunmadan yeni sürüm eklenebilir:

1. MP3 dosyasını `ses/` klasörüne yükle
2. `ses/manifest.json`'a yeni bir kayıt ekle:

```json
{
  "id":         "yatak",
  "label":      "Yatak Öncesi",
  "labelShort": "Yatak",
  "labelLong":  "Yatak öncesi sürümü",
  "dur":        "~15 dk",
  "icon":       "◐",
  "dosya":      "yatak.mp3"
}
```

Düğme otomatik oluşur, ses otomatik yüklenir.

---

## Yerel geliştirme

`file://` üzerinden bazı kısıtlamalar vardır:

- `fetch('./ses/manifest.json')` CORS hatası verir → fallback olarak
  yalnızca "Tam Sürüm" düğmesi görünür
- Service Worker kayıt olmaz → offline cache devre dışı

Bu kısıtlamalar HTTP sunucu üzerinde otomatik çözülür:

```bash
# Python 3
python3 -m http.server 8000
# → http://localhost:8000
```

---

## Lisans

| Bileşen | Lisans |
|---------|--------|
| Kod (HTML, CSS, JS, Service Worker) | [EUPL 1.2](LICENSE) |
| Ses kayıtları | CC BY-NC-SA 4.0 |
| Görseller, metinler, dokümantasyon | CC BY-SA 4.0 |
| Chart.js | MIT |
| IBM Plex Sans/Mono | SIL OFL 1.1 |

Ayrıntılı içerik lisansı: [LICENSE-CONTENT.md](LICENSE-CONTENT.md)

---

## Atıf

Bu yazılımı bilimsel çalışmada kullanırsanız:

> Berberoğlu, U. (2026). Duy ve Gevşe: Kronik boyun ağrısı için
> gevşeme egzersizi ve uyku günlüğü PWA uygulaması.
> <https://github.com/utkb/duy-ve-gevse>

---

## Yazar

**Dr. Öğr. Üyesi Utku Berberoğlu**
Balıkesir Üniversitesi
Sağlık Bilimleri Fakültesi
Fizyoterapi ve Rehabilitasyon Bölümü

Yazılım Claude Sonnet 4.6 (Anthropic) ile geliştirilmiştir.

---

## İletişim

Sorular, hata bildirimleri ve geri bildirim için:
[GitHub Issues](https://github.com/utkb/duy-ve-gevse/issues)

Akademik işbirliği ve ticari kullanım talepleri için yazara
Balıkesir Üniversitesi resmi kanallarından ulaşılabilir.

---

## Sürüm

Güncel sürüm: **v0.16** — bkz. [DEGISIKLIK_GUNLUGU.md](DEGISIKLIK_GUNLUGU.md)
