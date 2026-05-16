# Staging QA Post R3 Fix Validation - 2026-05-16

Document version: `2026-05-16-post-r3-fix`
Last updated: 2026-05-16
Status: ready for next staging QA rerun after backend redeploy from branch `Stagging`

## Source

- QA rerun report: `morneven-website/docs/STAGING_QA_RERUN_REPORT_2026-05-16-R3.md`
- Active failed run ID prefix: `QA-20260516-CODEX-STAGING-R3`

## R3 Defect Closure

| Defect | Status | Fix |
| --- | --- | --- |
| `STG-R3-001` Full migration fails uploaded asset parity | Fixed in backend code | Internal app routes such as `/lore/characters/char-007` are no longer treated as storage object paths. This prevents migration from trying to fetch route links as binary assets. |
| `STG-R3-002` Revoked security session does not close active WebSocket | Fixed in backend code | Security session revocation now invalidates realtime clients matching the revoked `sessionId`, sends `auth.session.invalidated`, and closes the socket. |

## Code Changes

| Repository | File | Change |
| --- | --- | --- |
| Backend | `src/utils/storage-cleanup.ts` | Added app-route exclusion for known internal route IDs while preserving real uploaded object paths under `gallery`, `news`, `chat`, `lore`, and other storage folders. |
| Backend | `src/realtime/events.ts` | Extended realtime invalidation to support either all sessions for a username or a specific `sessionId`. |
| Backend | `src/security/sessions/session-service.ts` | Session revocation now resolves affected sessions, updates them as revoked, and invalidates matching realtime clients. |

## Validation Performed

| Check | Result |
| --- | --- |
| Backend build, `npm run build` | PASS |
| Backend whitespace check, `git diff --check` | PASS |

## Required QA Rerun Scope

Run these after backend redeploy:

1. Version evidence for FE, active backend, and migration target.
2. Full migration transfer QA against `https://morneven-backend-staging.up.railway.app` if overwrite approval remains valid.
3. WebSocket auth and session invalidation QA.
4. Browser smoke on `/chat`, `/settings`, and `/security`.
5. Targeted role/security regression checks.

## Accepted Risks

| Risk | Status |
| --- | --- |
| FE lint warnings | Accepted for staging. 13 warnings, 0 errors. |
| FE bundle size warning | Accepted for staging as performance hardening item. |
| BE audit low vulnerabilities | Accepted for staging. 0 high and 0 critical remain. |
| Uploaded files lack direct delete endpoint | Accepted for staging. Use storage cleanup flow for orphaned objects. |
| Local Node version below project requirement | Accepted as local parity warning only. Deploy/runtime should use Node `>=24`. |

## QA Handoff

Give QA these documents for the next rerun:

- `morneven-website/docs/STAGING_QA_POST_R3_FIX_VALIDATION_2026-05-16.md`
- `morneven-website/docs/STAGING_QA_FIX_REPORT_2026-05-16.md`
- `morneven-website/docs/STAGING_QA_GUIDE_2026-05-14.md`
- `morneven-backend/QA_RAILWAY_TEST_GUIDE.md`
- `morneven-website/docs/STAGING_QA_RERUN_REPORT_2026-05-16-R3.md`
