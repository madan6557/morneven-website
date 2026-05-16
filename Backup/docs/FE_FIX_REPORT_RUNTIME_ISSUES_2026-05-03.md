# FE Fix Report: Runtime Issues After REST Integration

Date: 2026-05-03
Scope: Map, Settings extraction, System Chat Reconciliation

## Summary

Tiga issue runtime yang ditemukan setelah REST API berhasil terintegrasi sudah diperiksa dan diperbaiki di FE.

## 1. Map Placeholder Tidak Load

### Finding

Backend mengembalikan map image URL:

```text
https://placeholder.local/map.png
```

Domain ini tidak bisa di-resolve oleh browser production, sehingga image gagal load.

### FE Fix

- FE sekarang menganggap `https://placeholder.local/...` sebagai empty map image.
- Jika image map gagal load, FE otomatis fallback ke SVG placeholder internal.

### Files

- `src/services/mapApi.ts`
- `src/pages/MapPage.tsx`

### BE Follow Up

Backend sebaiknya tidak mengirim URL `placeholder.local` ke FE production. Detail request ada di `docs/BE_RUNTIME_FIX_REQUEST_2026-05-03.md`.

## 2. Settings Selalu Request Extraction Berkala

### Finding

Settings page melakukan polling extraction setiap 3 detik sejak page dibuka, walau tidak ada job `processing`.

### FE Fix

- Initial load tetap mengambil extraction history satu kali.
- Polling 3 detik hanya aktif ketika ada job dengan status `processing`.
- Jika tidak ada proses berjalan, Settings tidak melakukan request berkala.

### Download Fix

Download ZIP sebelumnya memakai anchor langsung ke URL backend, sehingga request tidak membawa bearer token. Sekarang FE download memakai `fetch` dengan header:

```http
Authorization: Bearer <token>
```

Lalu FE membuat object URL lokal untuk memicu download.

### Files

- `src/pages/SettingsPage.tsx`
- `src/services/extractionService.ts`

## 3. Chat Reconciliation Menghasilkan Undefined

### Finding

UI menampilkan nilai `undefined` ketika response backend tidak persis sama dengan shape FE.

### FE Fix

- Response reconciliation sekarang dinormalisasi.
- Field missing menjadi `0`.
- `ranAt` fallback ke timestamp saat ini.
- FE juga menerima response nested umum seperti `data.report` atau `data.summary`.

### Files

- `src/services/chatApi.ts`
- `src/pages/SettingsPage.tsx`

## Validation

Validation command completed successfully:

```powershell
node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit
npm run build
```
