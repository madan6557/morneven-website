# Morneven Institute Website

Website ini adalah portal utama Morneven Institute, dibangun menggunakan React, Vite, dan Tailwind CSS. Proyek ini mendukung fitur galeri, proyek, lore, dashboard author, dan sistem autentikasi.

## Fitur Utama
- Landing page
- Autentikasi pengguna
- Chat internal (DM, grup manual, dan kanal system-managed: team/division/institute)
- Dashboard author (akses terbatas)
- Halaman galeri dan detail
- Halaman proyek dan detail
- Halaman lore (karakter, tempat, teknologi)
- Pengaturan akun
- Notifikasi dan toast
- Integrasi Vercel Analytics dan Speed Insights

### Catatan versi chat saat ini (2026-04-27)
- Bubble chat: pesan user aktif tampil di kanan, user lain di kiri.
- Auto-scroll chat terfokus ke panel percakapan (tidak lagi mendorong scroll seluruh halaman pada mobile).
- Kanal `Institute · All Personnel` otomatis memiliki sample history untuk kebutuhan QA/demo unread + auto-scroll.

## Teknologi
- React + Vite
- React Router
- TanStack React Query
- Tailwind CSS
- Shadcn/ui
- Vercel Analytics & Speed Insights

## Struktur Folder
- `src/` - Semua source code utama
- `src/pages/` - Halaman utama aplikasi
- `src/components/` - Komponen UI
- `src/contexts/` - Context API
- `src/services/` - Service/API helper
- `src/data/` - Data statis (JSON)
- `public/` - File statis

## Cara Menjalankan
1. Install dependencies:
	```bash
	npm install
	```
2. Jalankan development server:
	```bash
	npm run dev
	```
3. Build untuk produksi:
	```bash
	npm run build
	```

## Deployment
Deploy otomatis ke Vercel. Analytics dan Speed Insights aktif jika di-deploy di Vercel.

## Dokumen Kesiapan
- `docs/chat-readiness-assessment-2026-04-27.md` - penilaian khusus modul chat.
- `docs/full-platform-readiness-assessment-2026-04-27.md` - penilaian kesiapan demo seluruh fitur utama.
<<<<<<< codex/validate-feature-for-demo-readiness
- `docs/backend-requirements-full-platform-2026-04-27.md` - requirement BE detail lintas semua fitur untuk meminimalkan revisi implementasi.
=======
>>>>>>> main


## Kontribusi
Pull request dan issue sangat diterima.

## Lisensi
MIT
