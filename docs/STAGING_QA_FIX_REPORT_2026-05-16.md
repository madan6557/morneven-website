# Staging QA Fix Report - 2026-05-16

Document version: `2026-05-16-r3-handoff`
Last updated: 2026-05-16
Status: ready for staging QA rerun after owner confirmed FE redeploy and production runtime env

Referensi:

- `morneven-website/docs/STAGING_QA_REPORT_2026-05-15.md`
- `morneven-backend/qa/reports/dev-api-qa-QA-20260515-CODEX-STAGING-FULL.md`
- `morneven-website/docs/STAGING_QA_RERUN_REPORT_2026-05-16-R2.md`

Branch kerja:

- Backend: `Stagging`
- Frontend: `Stagging`

## QA Handoff Documents

Berikan dokumen berikut ke QA untuk rerun berikutnya:

| Priority | Document | Purpose |
| --- | --- | --- |
| Required | `morneven-website/docs/STAGING_QA_FIX_REPORT_2026-05-16.md` | Dokumen utama. Berisi perubahan terbaru, status fix, validasi lokal, status konfigurasi terbaru, dan target rerun. |
| Required | `morneven-website/docs/STAGING_QA_GUIDE_2026-05-14.md` | Runbook staging QA frontend dan full-system acceptance. Sudah diperbarui ke revisi `2026-05-16-r3-handoff`. |
| Required | `morneven-backend/QA_RAILWAY_TEST_GUIDE.md` | Runbook endpoint QA backend Railway. Sudah diperbarui ke revisi `2026-05-16-r3-handoff`. |
| Reference | `morneven-website/docs/STAGING_QA_RERUN_REPORT_2026-05-16-R2.md` | Evidence R2. Dipakai untuk memastikan blocker release evidence sudah tertutup pada rerun berikutnya. |
| Reference | `morneven-website/docs/STAGING_QA_REPORT_2026-05-16.md` | Evidence rerun sebelumnya. Dipakai untuk membandingkan defect yang harus tertutup. |
| Reference | `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-RERUN.md` | Evidence API rerun sebelumnya. Dipakai untuk membandingkan hasil full API runner. |

Dokumen yang paling penting untuk QA adalah `STAGING_QA_FIX_REPORT_2026-05-16.md`; dokumen ini sudah mencatat bahwa guest mode canonical memakai `/api/auth/guest`, sedangkan `guest@morneven.com` hanya akun PL0 terdaftar opsional. Rerun berikutnya harus memperbarui evidence `/version` karena R2 gagal formal acceptance akibat FE belum redeploy dan backend masih melapor `env: development`.

## Summary

Status perbaikan lokal: siap rerun staging. Owner sudah mengonfirmasi FE sudah redeploy dan semua instance terkait memakai `NODE_ENV=production`.

Update 2026-05-16:

- Staging FE URL dikonfirmasi tetap `https://morneven.com`.
- Staging BE URL dikonfirmasi tetap `https://morneven-backend-development.up.railway.app`.
- Redeploy FE sudah dilakukan oleh owner setelah R2. QA tetap perlu menangkap `/version` untuk commit evidence.
- Semua active instance sudah dikonfirmasi owner memakai `NODE_ENV=production`.
- Target migration untuk rerun berikutnya adalah `https://morneven-backend-staging.up.railway.app`.
- Target migration staging tersebut juga sudah dikonfirmasi owner memakai `NODE_ENV=production`.
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
- Manual chat group sekarang punya hard-delete endpoint untuk group admin dan leave flow dengan successor handoff. Jika anggota habis, group otomatis dihapus.
- Identitas pembuat group dan waktu pembuatan tetap diserialisasi sebagai `createdBy` dan `createdAt` selama group masih ada, meskipun admin berganti.
- Backend `package-lock.json` tidak lagi di-ignore agar npm lockfile menjadi canonical untuk repeatable staging build.
- FE `bun.lockb` stale dihapus karena deployment dan lockfile canonical memakai npm.
- Browserslist database diperbarui; FE build tidak lagi mengeluarkan stale Browserslist warning.

Current validation after post-rerun fixes:

- Backend build: `npm run build` passed.
- Frontend build: `npm run build` passed.
- Frontend lint: `npm run lint` passed with 0 errors and 13 accepted warnings.
- Frontend tests: `npm test` passed, 3 files and 10 tests.
- Frontend audit high: `npm audit --audit-level=high --json` passed, 0 vulnerabilities.
- Backend audit high: `npm audit --audit-level=high --json` passed for high and critical, 5 low transitive findings remain accepted for staging.
- QA runner syntax/help: `node qa/dev-api-qa.mjs --help` passed.

Known validation warnings:

- FE build still warns about large single bundle. This is accepted for staging and remains a production performance hardening item.
- FE lint still reports 13 warnings: shadcn/ui fast-refresh export patterns, validation dialog imperative helper exports, AuthContext hook export pattern, and ChatPage scroll hook dependency warnings. These are accepted for staging because they are non-runtime lint guidance and changing them would require broader UI library refactor or risk scroll regression.
- Vitest emits a Vite recommendation to switch from `@vitejs/plugin-react-swc` to `@vitejs/plugin-react` for performance. Current tests still pass, so this is not a staging blocker.
- FE local validation runs on Node 22.12 and now warns because project requires Node `>=24`. Staging should use Node 24 or newer.
- BE local validation runs on Node 22.12 and now warns because project requires Node `>=24`. Staging should use Node 24 or newer.
- BE audit still has low Google Cloud Storage transitive findings. `@google-cloud/storage` is already at npm latest, and `npm audit fix --force` suggests downgrading to older major, so downgrade is not recommended. Accepted risk for staging.

## Configuration Status For Rerun

Owner-confirmed status before rerun:

1. Frontend has been redeployed after R2.
2. All active instances have `NODE_ENV=production`.
3. Staging backend env should remain aligned with the provided values:
   `RATE_LIMIT_WINDOW_MS=900000`, `RATE_LIMIT_MAX=1200`, `AUTH_RATE_LIMIT_WINDOW_MS=900000`, `AUTH_RATE_LIMIT_MAX=100`, `MAX_UPLOAD_MB=20`.
4. Backend should have `MIGRATION_KEY` and `EXTRACTION_KEY` set to the owner-provided secret value.
5. For extraction QA, run with `QA_EXTRACTION_KEY` equal to backend `EXTRACTION_KEY`.
6. Use Node.js `>=24` for both FE and BE builds/runtime.
7. Frontend deploy should receive a commit env, preferably `VERCEL_GIT_COMMIT_SHA` from Vercel or `BUILD_COMMIT_SHA` if deployed elsewhere.
8. If a CDN or proxy sits in front of FE, do not cache `/health`, `/ready`, or `/version`.
9. Full migration transfer may target `https://morneven-backend-staging.up.railway.app` only if QA has approval to overwrite that staging target data.

R2 blockers that must be rechecked:

| R2 blocker | Expected R3 evidence |
| --- | --- |
| FE `/version` exposed an older commit | FE `/version` returns the redeployed `Stagging` candidate commit and `env: production`. |
| BE `/version` reported `env: development` | BE `/version` and `/api/version` return `env: production`. |
| QA guide frozen table listed old development commits | QA uses the updated `2026-05-16-r3-handoff` guide and records deployed commit evidence from `/version`. |

## Information Needed

- Commit SHA deployed for FE and BE after the latest redeploy. QA should capture this from `/version`.
- Confirmation from QA evidence that FE and BE `/version` both report `env: production`.
- Confirmation from QA evidence that the migration target `https://morneven-backend-staging.up.railway.app` reports `env: production` before any full migration transfer.
- Confirmation that `MIGRATION_KEY`, `EXTRACTION_KEY`, and QA-side `QA_EXTRACTION_KEY` are set without exposing the secret value in reports.
