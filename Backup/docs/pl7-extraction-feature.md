# PL7 Extraction Feature Specification

## Overview
Fitur baru di menu **Settings** untuk personel **PL7** agar bisa mengekstrak data dalam format `.zip` dengan proses background.

## Scope
1. **DB Data Extraction**
   - Data diexport ke JSON per kategori: `character`, `creature`, `places`, `projects`, `technology`, `events`, `others`, `gallery`.
2. **Images Extraction**
   - Export daftar aset gambar per kategori (map + gallery image manifest).
3. **All Data Extraction**
   - Kombinasi DB + Images dalam satu ZIP.

## Security Rules
- Hanya user dengan clearance **PL7** yang bisa menjalankan fitur.
- User wajib mengisi password akun yang sedang login.
- User wajib mengetik kata konfirmasi persis: `CONFIRM`.

## UX / Flow
1. Pilih mode extraction (`All`, `DB`, `Images`).
2. Tentukan opsi **Auto download when completed**.
3. Isi password akun + ketik `CONFIRM`.
4. Tekan **Start Extraction**.
5. Job berjalan di background; user bisa meninggalkan halaman.
6. Saat selesai, tombol/link **Download ZIP** muncul di history.

## History & Retention
- Riwayat extraction disimpan selama **30 hari**.
- Entry expired otomatis dibersihkan saat history dibuka/refreshed.
- Tersedia aksi:
  - **Clear selected** (multi-select/cherry-pick)
  - **Clear all**

## Output Structure (ZIP)
- `db/*.json` untuk export data database per kategori.
- `images/map/images.json` untuk data map image.
- `images/character/images.json`, `images/creature/images.json`, `images/technology/images.json`, `images/environment/images.json`, dan `images/other/images.json` untuk kategori gallery image.
