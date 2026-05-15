# Staging QA Fix Report - 2026-05-16

Referensi:

- `morneven-website/docs/STAGING_QA_REPORT_2026-05-15.md`
- `morneven-backend/qa/reports/dev-api-qa-QA-20260515-CODEX-STAGING-FULL.md`

Branch kerja:

- Backend: `Stagging`
- Frontend: `Stagging`

## Summary

Status perbaikan lokal: siap rerun staging setelah redeploy FE dan BE dari branch `Stagging`.

Perbaikan utama:

- Route limiter backend diselaraskan dengan env staging untuk `/auth` dan `/files`.
- `/api/auth/me` tidak lagi memakai bucket auth mutation limiter.
- Frontend tidak lagi clear session saat `/auth/me` terkena 429 sementara.
- File proxy FE menambah in-memory blob cache, request coalescing, dan mengurangi fetch berulang untuk asset yang sama.
- Authenticated image component tidak lagi fallback ke direct proxy URL tanpa Bearer token.
- FE build sekarang menghasilkan `/health`, `/ready`, dan `/version` JSON artifacts untuk static hosting.
- QA runner diselaraskan dengan kontrak aktual untuk guest, chat reconcile, dan extraction secret key.
- Dependency audit high sudah turun ke 0 untuk FE dan BE melalui non-major audit fix.

## Fix Mapping

| QA ID | Status | Perbaikan |
| --- | --- | --- |
| STG-001 Backend and FE version evidence mismatch | Fixed for FE build path, BE already has version route | FE Vite build sekarang menulis `dist/health`, `dist/ready`, dan `dist/version`. `vercel.json` memakai rewrites dan JSON headers agar static files tetap diprioritaskan sebelum SPA fallback. |
| STG-002 Dependency audit fail | Fixed for high severity | `npm audit fix --audit-level=high` dijalankan. Hasil audit high: BE 0 high, FE 0 high. Sisa low atau moderate butuh major upgrade atau risk acceptance. |
| STG-003 `/api/auth/me` rate limited at 20 | Fixed | `securityLimiters.auth` sekarang memakai `AUTH_RATE_LIMIT_WINDOW_MS` dan `AUTH_RATE_LIMIT_MAX`, serta skip `GET /auth/me`. FE juga mempertahankan session lokal jika session validation menerima 429 sementara. |
| STG-004 `/api/files/object` rate limited during responsive checks | Fixed | `securityLimiters.files` sekarang memakai `RATE_LIMIT_WINDOW_MS` dan `RATE_LIMIT_MAX`. Response object file dinaikkan cache header ke `private, max-age=3600, stale-while-revalidate=86400`. FE file proxy menambah blob cache dan pending request coalescing, serta image component tidak lagi melakukan fallback direct proxy request tanpa auth header. |
| STG-005 Guest seed credential invalid | Contract aligned | QA runner sekarang memakai `POST /api/auth/guest` sebagai default guest login. Jika seed credential guest tetap ingin diuji, set `QA_GUEST_LOGIN_MODE=credentials`. Staging guide diperbarui agar guest negative checks memakai guest endpoint. |
| STG-006 Chat reconcile permission mismatch | Contract aligned | QA runner dan guide diperbarui. Chat reconcile adalah PL7 maintenance only: author, admin, atau security. PL6 executive sekarang expected `403`. |
| STG-007 FE health/version returns SPA HTML | Fixed for generated static deploy | Vite build menulis extensionless JSON files, dan Vercel route config sekarang memberi prioritas filesystem sebelum SPA rewrite. |
| STG-008 Missing token console noise | Partially fixed | File proxy tidak lagi `console.error` ketika token tidak ada atau object fetch gagal, sehingga unauthenticated route tidak menghasilkan noise dari asset fetch. Noise lain di luar file proxy perlu diverifikasi pada rerun browser QA. |
| STG-009 Extraction payload missing `secretKey` | Fixed in runner and docs | QA runner mengirim `secretKey` dari `QA_EXTRACTION_KEY` atau `EXTRACTION_KEY`. Jika env tidak tersedia, runner menandai extraction sebagai blocked dengan alasan konfigurasi. |

## Validation

Local validation:

- Backend build: `npm run build` passed.
- Frontend build: `npm run build` passed.
- Backend audit high: `npm audit --audit-level=high --json` returned 0 high and 0 critical.
- Frontend audit high: `npm audit --audit-level=high --json` returned 0 high and 0 critical.
- QA runner syntax/help: `node qa/dev-api-qa.mjs --help` passed.
- FE build artifacts verified locally: `dist/health`, `dist/ready`, and `dist/version` generated as JSON.

Known validation warnings:

- FE build still warns about stale Browserslist data.
- FE build still warns about large single bundle. This existed before and is not blocking staging rerun, but remains a production performance risk.
- FE audit still has moderate Vite/esbuild findings that require major Vite upgrade according to npm.
- BE audit still has low Google Cloud Storage transitive findings where npm suggests a breaking package change.

## Configuration Adjustment Request

Before rerun staging QA:

1. Redeploy backend from branch `Stagging`.
2. Redeploy frontend from branch `Stagging`.
3. Keep staging backend env aligned with the provided values:
   `RATE_LIMIT_WINDOW_MS=900000`, `RATE_LIMIT_MAX=1200`, `AUTH_RATE_LIMIT_WINDOW_MS=900000`, `AUTH_RATE_LIMIT_MAX=100`, `MAX_UPLOAD_MB=20`.
4. Ensure backend has `EXTRACTION_KEY` set with minimum 16 characters.
5. For extraction QA, run with `QA_EXTRACTION_KEY` equal to backend `EXTRACTION_KEY`.
6. Ensure frontend deploy receives a commit env, preferably `VERCEL_GIT_COMMIT_SHA` from Vercel or `BUILD_COMMIT_SHA` if deployed elsewhere.
7. If a CDN or proxy sits in front of FE, do not cache `/health`, `/ready`, or `/version`.

## Information Needed

- Final staging FE URL and BE URL after redeploy.
- Commit SHA deployed for FE and BE after branch `Stagging` redeploy.
- Confirmation whether guest credential login must remain supported as a product requirement. Current QA contract now treats `POST /api/auth/guest` as canonical guest access.
- Decision on residual low and moderate audit findings: accept for staging, or approve major upgrade work for Vite 8, jsdom 28, and Google Cloud Storage dependency changes.
