# Morneven Production Deployment Readiness Report

Last updated: 2026-05-11
Timezone: Asia/Singapore
Scope: `morneven-website` and `morneven-backend`
Assessment type: local code validation, public endpoint smoke, existing QA report review, and non-destructive API checks

## Executive Verdict

| Area | Verdict | Reason |
| --- | --- | --- |
| Overall production readiness | Not ready | FE typecheck fails, public FE points to an unreachable dev API domain, dependency audits report high vulnerabilities, and production backend is running with `env: development`. |
| Backend deployment readiness | Not ready for production promotion | Backend build passes and production root health endpoints respond, but production environment is not configured as production and API-prefixed health endpoints return `404`. |
| Frontend deployment readiness | Not ready for production promotion | Production build passes, but TypeScript check fails and the public bundle is configured against `backend.dev.morneven.com`, which did not resolve during validation. |
| Integration readiness | Partially ready | REST integration baseline exists in code, but current public FE to BE path is broken by the dev API DNS issue. Full end-to-end production QA has not passed. |
| Safe next environment | Staging or development | Continue validation in a non-production environment until blockers are closed. |

Production deployment should be paused until the blocker checklist below is resolved and a fresh full QA pass is recorded.

## Validation Snapshot

| Item | Frontend | Backend |
| --- | --- | --- |
| Repository path | `morneven-website` | `morneven-backend` |
| Branch | `development` | `development` |
| HEAD at validation | `ce13abb` | `dd62487` |
| Latest commit subject | `Merge PR #83: chat derived state ordering cleanup` | `Merge PR #54: mention notifications` |
| Remote tracking | `development...origin/development` | `development...origin/development` |
| Working tree note | Existing local doc changes were present before this report: `docs/README.md`, `docs/security-module-proposal-2026-05-11.md` | Clean before this report |

## Production Gate Checklist

| Gate | Status | Evidence | Required Action |
| --- | --- | --- | --- |
| FE production build | Pass | `npm run build` completed successfully | Keep as release gate |
| FE TypeScript strict check | Fail | `node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit` fails in `src/pages/ChatPage.tsx` | Fix `ConversationAttachmentItem.createdAt` type mismatch before production |
| FE unit tests | Pass | `npm run test`: 3 files passed, 10 tests passed | Keep as release gate |
| FE lint | Warning | `npm run lint`: 0 errors, 17 warnings | Decide whether warnings are acceptable for production or clean them up |
| FE dependency audit | Fail | `npm audit --audit-level=high`: 19 vulnerabilities, including 9 high | Upgrade or patch vulnerable dependencies |
| BE TypeScript build | Pass | `npm run build` completed successfully | Keep as release gate |
| BE dependency audit | Fail | `npm audit --audit-level=high`: 6 vulnerabilities, including 1 high | Upgrade or patch vulnerable dependencies |
| Backend production root health | Pass | `GET https://morneven-backend-production.up.railway.app/health` returned `200` | Keep root healthcheck active |
| Backend production root readiness | Pass | `GET https://morneven-backend-production.up.railway.app/ready` returned `200` | Keep readiness check active |
| Backend production API health prefix | Fail | `/api/health`, `/api/ready`, `/v1/health`, `/v1/ready` returned `404` on production URL | Deploy current backend code or align health endpoint documentation |
| Backend production environment mode | Fail | `/health` response includes `env: development` | Set Railway production `NODE_ENV=production` |
| Development API domain | Fail | `backend.dev.morneven.com` did not resolve from validation machine | Fix DNS or change FE target to an available backend domain |
| Public FE page availability | Pass with warning | `https://morneven.com/` returned `200` | Continue, but API-backed flows are blocked by backend target |
| Public FE health endpoint | Warning | `https://morneven.com/health` and `/ready` returned HTML SPA content, not JSON health | Add or configure real FE health endpoints if Railway healthcheck depends on them |
| Public FE backend target | Fail | Public JS bundle contains `backend.dev.morneven.com` | Rebuild and redeploy FE with production or staging API URL |
| Production read-only API smoke | Pass | Production auth login, `/api/auth/me`, projects, gallery, lore characters, and chat conversations returned `200` with seed auth | Repeat after environment and DNS fixes |
| Full destructive QA on production | Not run | Production docs restrict destructive QA to dev unless explicitly approved | Do not run destructive QA on production |
| Full current end-to-end FE plus BE QA | Not complete | Existing QA reports are from 2026-05-02 and 2026-05-03, before current commits and current DNS issue | Rerun full regression after fixes |

## Frontend Readiness Detail

| Check | Result | Notes |
| --- | --- | --- |
| Build command | Pass | `vite build` completed and generated production assets |
| Build warning | Warning | Main JS chunk is `1,732.50 kB`, over the configured warning threshold |
| Browserslist data | Warning | Build reports caniuse-lite data is 11 months old |
| Unit tests | Pass | 10 Vitest tests passed |
| Lint | Warning | 17 warnings, mostly Fast Refresh export warnings and ChatPage hook dependency warnings |
| TypeScript | Fail | `ChatPage.tsx` maps `message.createdAt` as string into `ConversationAttachmentItem.createdAt`, which is typed as number |
| Runtime API target | Fail | Default client target is `https://backend.dev.morneven.com/api`, and public bundle includes that domain |
| Demo fallback | Pass for production path | `VITE_DEMO_FALLBACK` is not present in the public bundle check |
| FE server health behavior | Warning | `server.mjs` supports JSON `/health` and `/ready`, but current public site returned SPA HTML for those paths |

Frontend blocker:

```txt
src/pages/ChatPage.tsx(269,7): error TS2322:
Type '{ ... createdAt: string; ... }[]' is not assignable to type 'ConversationAttachmentItem[]'.
Types of property 'createdAt' are incompatible.
Type 'string' is not assignable to type 'number'.
```

Minimum frontend actions before production:

| Priority | Action | Acceptance Criteria |
| --- | --- | --- |
| P0 | Fix `ChatPage.tsx` type mismatch | `tsc -p tsconfig.app.json --noEmit` passes |
| P0 | Fix public API target | Public FE bundle points to a reachable production or staging API URL |
| P0 | Rerun FE build, typecheck, test, lint | Build, typecheck, and tests pass; lint has no production-blocking warnings |
| P1 | Reduce dependency audit risk | `npm audit --audit-level=high` has no high vulnerabilities or has documented accepted risk |
| P1 | Confirm FE health route behavior | `/health` and `/ready` return expected health JSON if used by hosting healthchecks |
| P2 | Address bundle size warning | Introduce code splitting for high-weight routes if performance budget requires it |

## Backend Readiness Detail

| Check | Result | Notes |
| --- | --- | --- |
| Build command | Pass | `tsc -p tsconfig.json` completed successfully |
| Production root health | Pass | Root `/health` returned `200` |
| Production root readiness | Pass | Root `/ready` returned `200` |
| Production API-prefixed health | Fail | `/api/health`, `/api/ready`, `/v1/health`, `/v1/ready` returned `404` |
| Production environment mode | Fail | Health response reports `env: development` |
| Development API DNS | Fail | `backend.dev.morneven.com` did not resolve |
| Auth smoke on production | Pass | Seed `author@morneven.com` login returned token |
| Protected read smoke on production | Pass | `/api/auth/me`, `/api/projects`, `/api/gallery`, `/api/lore/characters`, and `/api/chat/conversations` returned `200` |
| Security middleware | Pass in code | Helmet, CORS allowlist, rate limiting, compression, and proxy trust are configured |
| Migration deployment | Warning | Railway start runs `npm run prisma:migrate:deploy`, including a migration repair script | Confirm repair script is still required before production |
| Build identifier | Missing | QA guide states build identifier endpoint is not available | Add version or commit endpoint before production |
| Dependency audit | Fail | `npm audit --audit-level=high` reports one high vulnerability through `fast-xml-builder` |

Minimum backend actions before production:

| Priority | Action | Acceptance Criteria |
| --- | --- | --- |
| P0 | Set production environment variables correctly | `/health` reports `env: production` on production service |
| P0 | Fix backend domain strategy | FE target resolves consistently from browser and CI environments |
| P0 | Redeploy current backend code or reconcile docs | `/api/health` and `/api/ready` match documented behavior or documentation is corrected |
| P0 | Verify production CORS | Production backend allows `https://morneven.com` and rejects unapproved origins |
| P1 | Patch backend dependency audit findings | `npm audit --audit-level=high` has no high vulnerabilities or has documented accepted risk |
| P1 | Add build/version endpoint | QA can identify deployed commit without guessing from behavior |
| P1 | Confirm storage driver for production uploads | Storage is not local ephemeral storage unless that is explicitly accepted |
| P2 | Review migration repair script | Production start command should not carry obsolete repair logic longer than necessary |

## API And Integration Checklist

| Area | Status | Evidence | Production Requirement |
| --- | --- | --- | --- |
| REST client foundation | Present | FE `restClient.ts` centralizes base URL, token storage, refresh, envelope unwrap, timeout, upload, and pagination helpers | Keep and test against production API |
| Auth integration | Present | FE `AuthContext.tsx` uses `/auth/login`, `/auth/register`, `/auth/guest`, `/auth/me`, `/auth/logout`, and token refresh | Verify full session behavior on production |
| Presence heartbeat | Present | Authenticated non-guest users send heartbeat every 30 seconds and on focus or visible state | Confirm backend rate limit supports this traffic |
| Content REST adapters | Present | Projects, gallery, lore, news, map, personnel, management, notifications, extraction, command center, and chat services use REST calls | Run full browser QA against the selected API target |
| Demo fallback | Controlled | Fallback is restricted to test mode or explicit `VITE_DEMO_FALLBACK=true` | Ensure production deploy does not set `VITE_DEMO_FALLBACK=true` |
| WebSocket chat | Available in backend, not enabled in FE baseline | Backend attaches realtime WebSocket and docs state REST polling remains baseline | Decide whether production requires WebSocket before launch |
| Polling behavior | Present | Extraction polling only runs while a job is processing; notification and badge polling are documented fallback paths | Confirm production rate limits and UX requirements |
| System chat groups | Backend-owned | FE integration notes state FE should read backend system-managed groups and not create institute or division groups manually | Verify seeded or auto-created groups exist in production DB |

## Existing QA Evidence Reviewed

| Document | Status Used In This Report | Limitation |
| --- | --- | --- |
| `morneven-backend/qa/QA_FINAL_REPORT_2026-05-02_CODEX_RERUN.md` | Backend dev API passed 61 checks with 0 failures and 3 expected cleanup skips | Run is dated 2026-05-02 and targeted development API, not current production |
| `morneven-backend/qa/reports/dev-api-qa-QA-20260502-CODEX-RERUN.md` | Endpoint-level dev QA evidence exists | Not rerun during this assessment |
| `morneven-website/docs/FE_REST_API_INTEGRATION_REPORT_2026-05-03.md` | Confirms REST integration baseline was implemented | Current TypeScript validation no longer matches the old PASS claim |
| `morneven-website/docs/FE_QA_HANDOVER_REST_INTEGRATION_2026-05-03.md` | Provides FE regression checklist | Requires rerun after current fixes and deploy target correction |
| `morneven-website/docs/RAILWAY_FRONTEND_DEPLOYMENT_2026-05-03.md` | Documents FE Railway deployment path | Current public `/health` and `/ready` behavior does not match `server.mjs` JSON behavior |
| `morneven-backend/QA_RAILWAY_TEST_GUIDE.md` | Defines production vs development QA safety | Production remains read-only smoke unless explicitly approved |

## Blocker Register

| ID | Severity | Owner | Blocker | Impact | Exit Criteria |
| --- | --- | --- | --- | --- | --- |
| PROD-BLOCK-001 | P0 | FE | TypeScript strict check fails in `ChatPage.tsx` | Cannot claim release-quality FE build even though Vite transpile build passes | Typecheck passes locally and in CI |
| PROD-BLOCK-002 | P0 | FE or DevOps | Public FE points to `backend.dev.morneven.com` | API-backed public flows fail if DNS remains unresolved | Public bundle points to reachable production or staging backend |
| PROD-BLOCK-003 | P0 | DevOps | `backend.dev.morneven.com` DNS does not resolve | Staging and current public FE integration path are unavailable | DNS resolves and health/readiness checks pass |
| PROD-BLOCK-004 | P0 | BE or DevOps | Production backend health reports `env: development` | Production environment separation is not reliable | Production health reports `env: production` |
| PROD-BLOCK-005 | P0 | BE | Production API-prefixed health endpoints return `404` | QA guide and code expectation do not match deployed production behavior | `/api/health` and `/api/ready` return `200`, or docs and healthcheck policy are updated |
| PROD-BLOCK-006 | P1 | FE | FE dependency audit has high vulnerabilities | Security risk before public production hardening | High audit findings removed or accepted with written risk note |
| PROD-BLOCK-007 | P1 | BE | BE dependency audit has high vulnerability | Security risk before production hardening | High audit findings removed or accepted with written risk note |
| PROD-BLOCK-008 | P1 | QA | No current full FE plus BE production-like regression after latest commits | Production readiness would rely on stale QA evidence | Fresh QA report passes against selected production candidate environment |

## Recommended Production Readiness Sequence

| Step | Action | Owner | Completion Signal |
| --- | --- | --- | --- |
| 1 | Fix `ChatPage.tsx` TypeScript mismatch | FE | `tsc -p tsconfig.app.json --noEmit` passes |
| 2 | Choose final API target for public FE | Product or DevOps | Decision recorded: production backend URL or staging backend URL |
| 3 | Fix `backend.dev.morneven.com` DNS or stop using it for public FE | DevOps | DNS resolution and `/health` pass |
| 4 | Configure backend production environment | DevOps | `/health` returns `env: production` |
| 5 | Align backend health endpoints | BE | Root and documented API health endpoints behave consistently |
| 6 | Patch or risk-accept high dependency audit findings | FE and BE | Audit report or risk acceptance is attached |
| 7 | Rebuild and redeploy backend | BE or DevOps | Build passes and deployment healthcheck passes |
| 8 | Rebuild and redeploy FE with corrected API URL | FE or DevOps | Public bundle no longer contains unreachable dev domain |
| 9 | Run non-destructive production smoke | QA | Auth, read endpoints, route smoke, and CORS pass |
| 10 | Run full staging or dev regression with mutation allowed | QA | Fresh report shows no P0 or P1 defects |
| 11 | Production launch approval | Product, FE, BE, QA | Signed checklist or release note exists |

## Release Decision Checklist

Use this checklist immediately before production promotion.

| Checklist Item | Required For Production | Current Status |
| --- | --- | --- |
| FE branch is clean except approved release docs | Yes | Not met, existing local doc changes present plus this report |
| BE branch is clean except approved release docs | Yes | Met before this report |
| FE build passes | Yes | Met |
| FE typecheck passes | Yes | Not met |
| FE tests pass | Yes | Met |
| FE lint has no release-blocking findings | Yes | Needs decision |
| FE high dependency vulnerabilities are resolved or accepted | Yes | Not met |
| BE build passes | Yes | Met |
| BE high dependency vulnerabilities are resolved or accepted | Yes | Not met |
| Production backend reports production environment | Yes | Not met |
| Production backend health and readiness endpoints match docs | Yes | Not met |
| Public FE uses reachable backend URL | Yes | Not met |
| Production CORS allows public FE origin | Yes | Not validated in this run |
| Full FE plus BE regression passes after final deploy candidate | Yes | Not met |
| Rollback plan exists | Yes | Not validated in this run |
| Database backup and migration rollback plan exist | Yes | Not validated in this run |
| Storage cleanup policy exists for uploads and extraction artifacts | Yes | Not fully met |
| Build identifier is visible from deployed service | Recommended | Not met |

## Final Recommendation

Do not promote the current system state to production.

The codebase has made substantial progress toward REST integration, and both FE and BE can build locally. However, production readiness requires more than a successful Vite build and backend root health. The current release candidate has a TypeScript blocker, high dependency audit findings, deployment target mismatch, unresolved dev API DNS, and production environment misconfiguration.

The fastest safe path is to treat the next deployment as a staging candidate, close the P0 blockers, then rerun full FE plus BE regression before production approval.
