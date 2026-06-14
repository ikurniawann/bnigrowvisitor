# BNI Visitor Manager — Progress & Handoff

Sistem manajemen visitor untuk BNI, multi-tenant SaaS berbasis subdomain per chapter.

**Production:** `https://grow.bni-vh.com` (Chapter Grow) · `https://rise.bni-vh.com` (Chapter Rise) · `https://bni-vh.com` (National)

---

## Status Terakhir (14 Juni 2026)

Semua fitur di bawah sudah **deployed ke production** (branch `main` → Vercel).

---

## Fitur yang Sudah Selesai

### 1. Branding Login
- Logo diganti ke `bni-logo.png` (file ada di `public/`)
- Stats halaman login: **1659+ Active Members · 25+ Chapters · 6+ Cities**

### 2. Multi-Tenant Per Subdomain
- Apex `bni-vh.com` = National admin
- Subdomain `grow.bni-vh.com`, `rise.bni-vh.com`, dll = Chapter masing-masing
- Chapter branding (nama, warna, inisial) otomatis detect dari subdomain
- File: `src/lib/chapterBranding.ts`, `src/hooks/useChapterBranding.ts`

### 3. Role Hierarchy
```
national_admin / admin
  └── chapter_admin  (= "super admin" per chapter)
        └── pic       (Visitor Host)
              └── member
```

### 4. BNI Assistant (AI)
- National scope (`bni-vh.com`): nama **"BNI Assistant"**, akses data semua chapter
- Chapter scope: nama `{Chapter} Assistant`, data terbatas chapter sendiri
- File: `src/components/assistant/GrowAssistant.tsx`, `src/app/api/grow-assistant/route.ts`

### 5. Manajemen Akun PIC (oleh Chapter Admin)
- Chapter admin bisa **buat, edit, set password, aktif/nonaktif** akun PIC
- PIC hanya bisa **reset password diri sendiri** (menu "Ubah Password Saya" di sidebar)
- Isolasi: chapter admin tidak bisa akses PIC chapter lain
- API: `src/app/api/pic-accounts/route.ts`
- UI: `src/components/pages/ManagePicAccounts.tsx`
- Page: `src/app/(dashboard)/chapter/[chapterId]/pic-accounts/page.tsx`

### 6. Edit Member oleh Chapter Admin
- Chapter admin bisa edit semua field member termasuk email & password
- File: `src/components/pages/Members.tsx` (flag `isSuperAdmin`)

### 7. Konfirmasi Kehadiran via Link WA
- Setiap visitor punya link unik: `https://grow.bni-vh.com/wm/{visitorId}`
- Klik link → status visitor otomatis berubah ke `confirmed`
- Page public tanpa auth: `src/app/wm/[token]/page.tsx`
- Status yang bisa dikonfirmasi: `new`, `followup`
- Status sudah selesai (tidak diubah lagi): `confirmed`, `attended`, `interview`, `member`, `not_continue`

### 8. Template WA dengan `{link_hadir}`
- Variabel `{link_hadir}` ditambahkan ke template WA
- `buildWaLink` di Visitors.tsx otomatis inject URL konfirmasi ke variabel ini
- Template lama di localStorage yang belum punya `{link_hadir}` otomatis diinjeksi saat `normalizeTemplate` dipanggil
- File: `src/lib/waTemplate.ts`, `src/components/pages/Visitors.tsx`

### 9. Master Wilayah — Domain List
- Domain `vercel` dan `localhost` difilter dari tampilan dropdown
- File: `src/components/pages/MasterData.tsx`

---

## Arsitektur Teknis

### Auth
- Custom auth, bukan Supabase Auth
- Tabel `users` di Supabase
- Session: signed HMAC cookie `bni_session`
- File: `src/lib/auth.ts`, `src/lib/server/session.ts`

### Data Access
- Supabase service role (`getSupabaseAdmin()`) di server — bypass RLS
- RLS tetap aktif sebagai defense-in-depth
- Client-side: fetch ke `/api/data/*` yang wrap service role

### Database
- Migrations: `supabase/migrations/`
- Tabel utama: `users`, `visitors`, `members`, `meetings`, `chapters`, `domains`

### Supabase Admin Client
```ts
// src/lib/server/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'
export const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
```

---

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
HMAC_SECRET=
OPENAI_API_KEY=
```

---

## Cara Lanjut Development

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build
```

### Branch
- `main` → production (auto-deploy ke Vercel)
- Feature branch baru dari `main`, merge ke `main` untuk deploy

---

## Backlog / Ide Fitur Berikutnya

Belum diimplementasi, bisa dilanjutkan:

- [ ] **Notifikasi WA blast** — kirim WA ke semua visitor yang belum konfirmasi H-1 meeting
- [ ] **QR Code check-in** — alternatif konfirmasi hadir saat event berlangsung
- [ ] **Dashboard analytics chapter** — grafik konversi visitor → member per chapter
- [ ] **Export PDF undangan** — cetak undangan per visitor dengan detail meeting
- [ ] **Notifikasi in-app** — bell/toast ketika ada visitor baru masuk

---

## File Penting

| File | Fungsi |
|------|--------|
| `src/lib/waTemplate.ts` | Template & rendering WA, termasuk `{link_hadir}` |
| `src/lib/auth.ts` | Login, session, role check |
| `src/lib/server/session.ts` | HMAC cookie verify |
| `src/components/pages/Visitors.tsx` | Tabel visitor, buildWaLink |
| `src/components/pages/ManagePicAccounts.tsx` | CRUD akun PIC |
| `src/app/wm/[token]/page.tsx` | Public confirmation page |
| `src/app/api/pic-accounts/route.ts` | API manage PIC |
| `src/app/api/my-account/route.ts` | Self-reset password PIC |
| `src/components/assistant/GrowAssistant.tsx` | BNI Assistant UI |
| `src/app/api/grow-assistant/route.ts` | AI Assistant backend |

---

## Getting Started (Next.js default)

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.
