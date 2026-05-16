# Morneven Production Readiness Hardening Plan - 2026-05-16

Document version: `2026-05-16-production-hardening`
Date: 2026-05-16
Timezone: Asia/Singapore
Status: ready to execute after staging sign-off

## Baseline

The staging candidate is signed off as `PASS WITH RISKS` in:

- `morneven-website/docs/STAGING_SIGN_OFF_2026-05-16.md`
- `morneven-website/docs/STAGING_QA_POST_R3_RERUN_REPORT_2026-05-16-R4.md`

This plan supersedes the blocker state in `PRODUCTION_DEPLOYMENT_READINESS_REPORT_2026-05-11.md`. The 2026-05-11 report remains historical evidence. The current baseline is the R4 staging candidate.

## Current Production Readiness Verdict

| Area | Verdict | Reason |
| --- | --- | --- |
| Staging gate | Passed with risks | R4 found no open P0, P1, or P2. |
| Production promotion | Not yet approved | Production hardening and final production smoke are still required. |
| Safe next step | Production-readiness hardening | No further staging rerun is required unless code or env changes. |

## Candidate Evidence

| Component | Branch | Candidate commit | Required production runtime |
| --- | --- | --- | --- |
| Frontend | `Stagging` | `2cb3462c53b13af645290cb06bdd425ce93977f2` | `NODE_ENV=production`, Node `>=24` |
| Backend | `Stagging` | `a53aea5abe44b01130c9a3d35b720237c8908af8` | `NODE_ENV=production`, Node `>=24` |

## Branch Policy

Staging has already been signed off, so do not continue hardening directly on the staging baseline.

| Branch | Purpose | Rule |
| --- | --- | --- |
| `Stagging` | Signed staging candidate evidence | Keep frozen unless a staging-only hotfix is required. |
| `development` | Synced integration baseline | Keep aligned with signed staging/main baseline before hardening merges. |
| `main` | Release baseline | Do not change directly except through approved promotion. |
| `production-hardening` | Current hardening work | Use this branch for production env docs, hardening fixes, smoke scripts, and release notes. |

Production-hardening changes should merge forward only after local validation passes and the owner approves the hardening scope.

## Hardening Workstreams

| ID | Workstream | Priority | Required action | Exit criteria |
| --- | --- | --- | --- | --- |
| PH-001 | Production env parity | P0 | Verify production FE, BE, DB, storage, CORS, rate limits, `MIGRATION_KEY`, and `EXTRACTION_KEY` are configured for production. | `/health`, `/ready`, and `/version` return production runtime evidence for FE and BE. |
| PH-002 | Production deploy target | P0 | Decide final production backend URL and ensure FE uses that URL without dev fallback. | Public FE bundle targets approved production API only. |
| PH-003 | Backup and rollback | P0 | Capture DB backup, storage backup, deploy rollback path, and migration rollback procedure. | Written rollback runbook exists and backup restore path is verified or explicitly dry-run accepted. |
| PH-004 | Final production smoke | P0 | Run non-destructive smoke on production after deploy. | Auth, read endpoints, CORS, `/chat`, `/settings`, `/security`, `/activity`, file proxy, and WebSocket smoke pass. |
| PH-005 | Security handoff | P1 | Hand off security console, session revoke, block/revoke, reports, and audit event surfaces to Security Manager team. | Security team acknowledges UI/API scope and adds their module backlog. |
| PH-006 | Bundle size | P2 | Plan route-level code splitting for large FE chunk. | Bundle warning is either reduced or accepted in release note. |
| PH-007 | FE lint warnings | P3 | Decide whether to refactor shadcn/ui export patterns and ChatPage scroll dependencies. | Warnings are removed or formally accepted for production launch. |
| PH-008 | BE low audit findings | P4 | Monitor Google Cloud Storage transitive chain and avoid unsafe downgrade. | 0 high/critical remains; low findings accepted or patched by safe upstream release. |
| PH-009 | Uploaded object deletion | P4 | Decide whether direct per-object delete endpoint is needed or storage cleanup is sufficient. | Product owner accepts storage cleanup workflow or endpoint is added and QA-tested. |
| PH-010 | CI/runtime Node parity | P3 | Ensure CI, FE deploy, and BE deploy use Node `>=24`. | Build logs confirm Node `>=24`. |

## Recommended Production Environment Values

These values are the recommended starting point for the first production candidate. They assume a small private user base, authenticated REST usage, file proxy traffic, and WebSocket chat.

### Backend Core

| Variable | Recommended value | Reason |
| --- | --- | --- |
| `NODE_ENV` | `production` | Required for production runtime evidence and secure cookie behavior if cookies are enabled later. |
| `PORT` | Platform-provided | Railway or hosting platform should inject this. |
| `CORS_ORIGIN` | `https://morneven.com` | Keep production allowlist tight. Add staging URL only if the same backend must serve staging temporarily. |
| `MAX_UPLOAD_MB` | `20` | Matches staging and current QA coverage. Increase only after upload performance and storage cost review. |
| `SECURITY_LEVEL` | `5` | Enables full security posture. |
| `SECURITY_BLOCK_TTL_MS` | `900000` | 15 minute default block TTL. |
| `SECURITY_RETENTION_DAYS` | `90` | Keeps audit/security history long enough for review without indefinite growth. |
| `FILE_SCAN_PROVIDER` | `none` | Current safe baseline unless Security Manager adds a real scanner. |
| `AUTH_COOKIE_ENABLED` | `false` | Current FE uses bearer token. Enable cookies only after dedicated cookie QA. |

### Rate Limits

| Profile | Variable | Recommended value |
| --- | --- | --- |
| Balanced production | `RATE_LIMIT_WINDOW_MS` | `900000` |
| Balanced production | `RATE_LIMIT_MAX` | `1200` |
| Balanced production | `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` |
| Balanced production | `AUTH_RATE_LIMIT_MAX` | `100` |

Use the balanced profile for launch. It matches the staging values that passed R4 and avoids false positives from image/file proxy, activity reads, chat, and responsive browser checks.

If abuse appears after launch, tighten in this order:

| Profile | `RATE_LIMIT_MAX` | `AUTH_RATE_LIMIT_MAX` | Use when |
| --- | ---: | ---: | --- |
| Conservative | `600` | `50` | Public traffic grows and normal usage stays below threshold. |
| Balanced | `1200` | `100` | Recommended launch default. |
| Lenient incident bypass | `2000` | `150` | Temporary mitigation if legitimate users hit 429 during launch. |

Do not reduce auth below `50` per 15 minutes until password reset, token refresh, and repeated failed login UX are separately tested. Do not reduce global below `600` while protected asset proxy and responsive image loading remain active.

### Storage And Migration

| Variable | Recommended value | Reason |
| --- | --- | --- |
| `STORAGE_DRIVER` | `gcs` or `s3` | Production should not depend on ephemeral local storage. |
| `GCS_BUCKET_NAME` or `S3_BUCKET_NAME` | Production bucket | Use a bucket separate from staging. |
| `MIGRATION_KEY` | Secret, 16+ chars | Required for migration receive/assets. Keep different from staging if possible. |
| `EXTRACTION_KEY` | Secret, 16+ chars | Required for extraction/backup. Keep different from staging if possible. |

For the current owner-provided shared key used in staging, rotate to a production-only value before production launch if operationally possible.

## Production Release Gates

| Gate | Required result |
| --- | --- |
| FE typecheck | PASS |
| FE lint | PASS, 0 errors, accepted warnings documented |
| FE tests | PASS |
| FE build | PASS |
| FE audit high | PASS, 0 high vulnerabilities |
| BE build | PASS |
| BE Prisma validate | PASS |
| BE audit high | PASS, 0 high and 0 critical vulnerabilities |
| FE `/version` | Commit and `env: production` captured |
| BE `/version` and `/api/version` | Commit and `env: production` captured |
| CORS | Approved frontend origin allowed, unapproved origin rejected |
| Auth smoke | Author/admin login, `/auth/me`, logout, and guest mode behavior pass |
| Read smoke | Projects, gallery, lore, activity, map, news, command center pass |
| Realtime smoke | WebSocket opens for valid user, rejects guest or invalid token, closes on session revoke |
| File proxy smoke | Protected object fetch works through backend proxy |
| Migration safety | Production migration endpoints are disabled operationally unless explicitly approved |
| Cleanup | No QA-created production data remains except documented read-only evidence |

## Final Production Smoke Scope

Use non-destructive production smoke only unless the owner explicitly approves mutation.

| Area | Routes or endpoints |
| --- | --- |
| Runtime | `/health`, `/ready`, `/version`, `/api/health`, `/api/ready`, `/api/version` |
| Frontend routes | `/`, `/home`, `/activity`, `/projects`, `/gallery`, `/lore`, `/chat`, `/settings`, `/security` |
| Auth | `/api/auth/login`, `/api/auth/me`, `/api/auth/guest`, `/api/auth/logout` |
| Core reads | `/api/projects`, `/api/gallery`, `/api/lore/characters`, `/api/news`, `/api/map/markers`, `/api/content-stats` |
| Operations | `/api/chat/conversations`, `/api/me/navigation-badges`, `/api/security/status` |
| Realtime | `/ws/chat?token=<token>` |

## Accepted Risk Policy

The current accepted staging risks can carry into production only if they are explicitly acknowledged in the release note:

| Risk | Recommended production decision |
| --- | --- |
| FE bundle size warning | Accept for initial launch if browser smoke remains clean, then harden with route splitting. |
| FE lint warnings | Accept if still 0 errors and no runtime issue is tied to warnings. |
| BE low audit findings | Accept while 0 high and 0 critical remain and no safe upstream fix exists. |
| Uploaded files direct delete missing | Accept only if storage cleanup scan/delete remains available to PL7-author or approved maintainer role. |
| Local Node mismatch | Do not accept for production runtime. Production build and runtime must use Node `>=24`. |

## Go Or No-Go Rule

Production promotion can proceed only when:

1. All P0 hardening workstreams are complete.
2. Final production smoke passes.
3. Any remaining P1 or lower risks are explicitly accepted in the release note.
4. Rollback and backup paths are documented.
5. Security Manager team has received the security module handoff.

If any P0 fails, do not promote to production.
