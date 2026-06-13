# Domain Multi-Tenant (National + Per-Chapter)

Model: **National admin pakai domain utama (apex), tiap chapter pakai subdomain
sendiri.** Membuat chapter baru otomatis membuat subdomain-nya.

```
bnivisitor.id            -> National (semua chapter)
grow.bnivisitor.id       -> Chapter BNI Grow
rise.bnivisitor.id       -> Chapter BNI Rise
<slug>.bnivisitor.id     -> chapter baru, dibuat otomatis saat add chapter
```

(`bnivisitor.id` hanya contoh — ganti dengan domain yang kamu beli.)

## Cara kerja di aplikasi (sudah dibangun)

- **Resolusi tenant:** `/api/tenant-context` membaca `Host` request. Apex =
  National; subdomain dicocokkan ke `chapter_domains.domain` → konteks chapter.
- **Auto-create subdomain:** saat National Admin menambah chapter di halaman
  Master Data, route `/api/master-data` otomatis membuat baris `chapter_domains`
  `<slug>.<APP_BASE_DOMAIN>` (primary). Slug dari nama chapter: `BNI Rise` → `rise`.
- **Gated by env:** kalau `APP_BASE_DOMAIN` belum diset, fitur auto-domain
  dorman (tidak ada yang rusak). Cocok untuk masa transisi sebelum domain dibeli.

## Yang HARUS kamu lakukan (infra, satu kali)

Subdomain sembarang **tidak bisa** di `*.vercel.app` — wajib custom domain.

1. **Beli domain** (mis. `bnivisitor.id`).
2. **DNS:** tambahkan record wildcard ke Vercel:
   - `A`/`CNAME` apex `bnivisitor.id` → Vercel
   - `CNAME` `*.bnivisitor.id` → `cname.vercel-dns.com` (wildcard)
3. **Vercel → Project → Settings → Domains:** tambahkan
   - `bnivisitor.id` (apex, national)
   - `*.bnivisitor.id` (wildcard, semua chapter)
4. **Vercel → Settings → Environment Variables:** set
   - `APP_BASE_DOMAIN=bnivisitor.id`
   lalu redeploy.
5. **Backfill chapter lama** (Grow, Rise) sekali:
   ```bash
   APP_BASE_DOMAIN=bnivisitor.id node scripts/backfill-chapter-domains.mjs
   ```
6. (Lokal/dev) tambahkan `APP_BASE_DOMAIN=` di `.env.local` bila ingin menguji.

Setelah langkah di atas, setiap chapter baru langsung punya subdomain aktif tanpa
konfigurasi tambahan.

## Catatan

- Domain primary lama (`bnigrowvisitor.vercel.app` → BNI Grow) tetap berfungsi
  sebagai domain tambahan; tidak dihapus.
- Resolusi tenant memberi **branding + konteks chapter**, bukan menggantikan cek
  izin: setelah login, akses tetap divalidasi role + `chapter_id` dari sesi.
- Penyederhanaan path per-subdomain (mis. `grow.bnivisitor.id/visitors` tanpa
  `/chapter/<id>/`) adalah peningkatan lanjutan; saat ini path tetap seperti
  sebelumnya, subdomain berperan untuk branding + konteks.
