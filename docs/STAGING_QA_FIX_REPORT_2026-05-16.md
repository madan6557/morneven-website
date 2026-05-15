# Staging QA Fix Report - 2026-05-16

Document version: `2026-05-16-r2`
Last updated: 2026-05-16
Status: ready for staging QA rerun after FE and BE redeploy from branch `Stagging`

Referensi:

- `morneven-website/docs/STAGING_QA_REPORT_2026-05-15.md`
- `morneven-backend/qa/reports/dev-api-qa-QA-20260515-CODEX-STAGING-FULL.md`

Branch kerja:

- Backend: `Stagging`
- Frontend: `Stagging`

## QA Handoff Documents

Berikan dokumen berikut ke QA untuk rerun berikutnya:

| Priority | Document | Purpose |
| --- | --- | --- |
| Required | `morneven-website/docs/STAGING_QA_FIX_REPORT_2026-05-16.md` | Dokumen utama. Berisi perubahan terbaru, status fix, validasi lokal, dan configuration adjustment request. |
| Required | `morneven-website/docs/STAGING_QA_GUIDE_2026-05-14.md` | Runbook staging QA frontend dan full-system acceptance. Sudah diperbarui ke revisi 2026-05-16. |
| Required | `morneven-backend/QA_RAILWAY_TEST_GUIDE.md` | Runbook endpoint QA backend Railway. Sudah diperbarui ke revisi 2026-05-16. |
| Reference | `morneven-website/docs/STAGING_QA_REPORT_2026-05-16.md` | Evidence rerun sebelumnya. Dipakai untuk membandingkan defect yang harus tertutup. |
| Reference | `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-RERUN.md` | Evidence API rerun sebelumnya. Dipakai untuk membandingkan hasil full API runner. |

Dokumen yang paling penting untuk QA adalah `STAGING_QA_FIX_REPORT_2026-05-16.md`; dokumen ini sudah mencatat bahwa guest mode canonical memakai `/api/auth/guest`, sedangkan `guest@morneven.com` hanya akun PL0 terdaftar opsional.

## Summary

Status perbaikan lokal: siap rerun staging setelah redeploy FE dan BE dari branch `Stagging`.

Update 2026-05-16:

- Staging FE URL dikonfirmasi tetap `https://morneven.com`.
- Staging BE URL dikonfirmasi tetap `https://morneven-backend-development.up.railway.app`.
- Redeploy sudah dilakukan oleh owner, QA tetap perlu menangkap `/version` untuk commit evidence.
- Guest mode produksi menggunakan `POST /api/auth/guest` dan tidak membutuhkan akun credential.
- `guest@morneven.com` adalah akun PL0 terdaftar opsional. Jika seed tersedia, akun ini harus bisa login dan mengakses menu Activity.
- Major dependency upgrade disetujui.
- Runtime Node.js minimum diset ke `>=24`; pin lama Node 20 dihapus dari FE deployment config dan Dockerfile dinaikkan ke Node 24.
- `MIGRATION_KEY` dan `EXTRACTION_KEY` sudah disediakan oleh owner melalui channel ini dan harus diset sebagai env, tetapi nilainya tidak ditulis ke dokumen repo.

Perbaikan utama:

- Route limiter backend diselaraskan dengan env staging untuk `/auth` dan `/files`.
- `/api/auth/me` tidak lagi memakai bucket auth mutation limiter.
- Frontend tidak lagi clear session saat `/auth/me` terkena 429 sementara.
- File proxy FE menambah in-memory blob cache, request coalescing, dan mengurangi fetch berulang untuk asset yang sama.
- Authenticated image component tidak lagi fallback ke direct proxy URL tanpa Bearer token.
- FE build sekarang menghasilkan `/health`, `/ready`, dan `/version` JSON artifacts untuk static hosting.
- QA runner diselaraskan dengan kontrak aktual untuk guest mode, akun guest terdaftar, chat reconcile, dan extraction secret key.
- Dependency audit high sudah turun ke 0 untuk FE dan BE.
- FE dependency major upgrade diterapkan untuk Vite, Vitest, jsdom, plugin React SWC, dan Lovable tagger compatibility.
- Stale `bun.lock` dihapus karena deployment dan lockfile canonical memakai npm.

## Fix Mapping

| QA ID | Status | Perbaikan |
| --- | --- | --- |
| STG-001 Backend and FE version evidence mismatch | Fixed for FE build path, BE already has version route | FE Vite build sekarang menulis `dist/health`, `dist/ready`, dan `dist/version`. `vercel.json` memakai rewrites dan JSON headers agar static files tetap diprioritaskan sebelum SPA fallback. |
| STG-002 Dependency audit fail | Fixed for high severity | `npm audit fix --audit-level=high` dijalankan dan major FE upgrade disetujui lalu diterapkan. Hasil audit FE: 0 vulnerability. Hasil audit BE: 0 high dan 0 critical, tersisa low transitive dari Google Cloud Storage latest. |
| STG-003 `/api/auth/me` rate limited at 20 | Fixed | `securityLimiters.auth` sekarang memakai `AUTH_RATE_LIMIT_WINDOW_MS` dan `AUTH_RATE_LIMIT_MAX`, serta skip `GET /auth/me`. FE juga mempertahankan session lokal jika session validation menerima 429 sementara. |
| STG-004 `/api/files/object` rate limited during responsive checks | Fixed | `securityLimiters.files` sekarang memakai `RATE_LIMIT_WINDOW_MS` dan `RATE_LIMIT_MAX`. Response object file dinaikkan cache header ke `private, max-age=3600, stale-while-revalidate=86400`. FE file proxy menambah blob cache dan pending request coalescing, serta image component tidak lagi melakukan fallback direct proxy request tanpa auth header. |
| STG-005 Guest seed credential invalid | Contract updated | QA runner tetap memakai `POST /api/auth/guest` untuk guest mode token. Credential `guest@morneven.com` sekarang diperlakukan sebagai akun PL0 terdaftar opsional, bukan syarat guest mode produksi. Jika seed tersedia, runner mengetes akses Activity untuk akun tersebut. |
| STG-006 Chat reconcile permission mismatch | Contract aligned | QA runner dan guide diperbarui. Chat reconcile adalah PL7 maintenance only: author, admin, atau security. PL6 executive sekarang expected `403`. |
| STG-007 FE health/version returns SPA HTML | Fixed for generated static deploy | Vite build menulis extensionless JSON files, dan Vercel route config sekarang memberi prioritas filesystem sebelum SPA rewrite. |
| STG-008 Missing token console noise | Partially fixed | File proxy tidak lagi `console.error` ketika token tidak ada atau object fetch gagal, sehingga unauthenticated route tidak menghasilkan noise dari asset fetch. Noise lain di luar file proxy perlu diverifikasi pada rerun browser QA. |
| STG-009 Extraction payload missing `secretKey` | Fixed in runner and docs | QA runner mengirim `secretKey` dari `QA_EXTRACTION_KEY` atau `EXTRACTION_KEY`. Jika env tidak tersedia, runner menandai extraction sebagai blocked dengan alasan konfigurasi. |

## Validation

Local validation:

- Backend build: `npm run build` passed.
- Frontend build: `npm run build` passed.
- Backend audit high: `npm audit --audit-level=high --json` returned 0 high and 0 critical, with 5 low transitive findings still reported.
- Frontend audit high: `npm audit --audit-level=high --json` returned 0 total vulnerabilities after Vite 8 upgrade.
- QA runner syntax/help: `node qa/dev-api-qa.mjs --help` passed.
- Frontend tests: `npm test` passed, 3 files and 10 tests.
- FE build artifacts verified locally: `dist/health`, `dist/ready`, and `dist/version` generated as JSON.

Post-rerun fix coverage added:

- Backend Activity tidak lagi menolak semua role `guest`; hanya token guest mode anonim dengan id `guest` yang ditolak.
- Frontend sidebar menampilkan menu Activity untuk akun terdaftar PL0, termasuk akun dengan role `guest`, selama user id bukan `guest`.
- Activity content row disesuaikan: Gallery menampilkan views, likes, dislikes, dan discussion; Lore menampilkan views, stars, dan discussion.
- Activity sort filter disesuaikan: kategori Gallery tidak menawarkan star sort, kategori Lore tidak menawarkan like atau dislike sort.
- Gallery image frame dibuat adaptif mengikuti rasio gambar tanpa crop.
- Gallery video thumbnail dibuat fit-to-frame dengan `object-contain`.
- QA runner tidak lagi menjadikan `guest@morneven.com` sebagai blocker guest mode, menambahkan check Activity untuk akun guest terdaftar jika seed tersedia, dan memperbaiki ekstraksi ID comment/reply Gallery.

Current validation after post-rerun fixes:

- Backend build: `npm run build` passed.
- Frontend build: `npm run build` passed.
- Frontend lint: `npm run lint` passed with 0 errors and the known 18 warnings.
- Frontend tests: `npm test` passed, 3 files and 10 tests.
- QA runner syntax/help: `node qa/dev-api-qa.mjs --help` passed.

Known validation warnings:

- FE build still warns about stale Browserslist data.
- FE build still warns about large single bundle. This existed before and is not blocking staging rerun, but remains a production performance risk.
- Vitest emits a Vite recommendation to switch from `@vitejs/plugin-react-swc` to `@vitejs/plugin-react` for performance. Current tests still pass, so this is not a staging blocker.
- FE local validation runs on Node 22.12 and now warns because project requires Node `>=24`. Staging should use Node 24 or newer.
- BE local validation runs on Node 22.12 and now warns because project requires Node `>=24`. Staging should use Node 24 or newer.
- BE audit still has low Google Cloud Storage transitive findings. `@google-cloud/storage` is already at npm latest, and `npm audit fix --force` suggests downgrading to older major, so downgrade is not recommended.

## Configuration Adjustment Request

Before rerun staging QA:

1. Redeploy backend from branch `Stagging`.
2. Redeploy frontend from branch `Stagging`.
3. Keep staging backend env aligned with the provided values:
   `RATE_LIMIT_WINDOW_MS=900000`, `RATE_LIMIT_MAX=1200`, `AUTH_RATE_LIMIT_WINDOW_MS=900000`, `AUTH_RATE_LIMIT_MAX=100`, `MAX_UPLOAD_MB=20`.
4. Ensure backend has `MIGRATION_KEY` and `EXTRACTION_KEY` set to the owner-provided secret value.
5. For extraction QA, run with `QA_EXTRACTION_KEY` equal to backend `EXTRACTION_KEY`.
6. Use Node.js `>=24` for both FE and BE builds/runtime.
7. Ensure frontend deploy receives a commit env, preferably `VERCEL_GIT_COMMIT_SHA` from Vercel or `BUILD_COMMIT_SHA` if deployed elsewhere.
8. If a CDN or proxy sits in front of FE, do not cache `/health`, `/ready`, or `/version`.

## Information Needed

- Commit SHA deployed for FE and BE after branch `Stagging` redeploy. QA should capture this from `/version`.
- Confirmation that staging env has been updated to Node.js `>=24`.
- Confirmation that `MIGRATION_KEY`, `EXTRACTION_KEY`, and QA-side `QA_EXTRACTION_KEY` are set without exposing the secret value in reports.
