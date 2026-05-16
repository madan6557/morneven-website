# Morneven Staging Sign-Off - 2026-05-16

Document version: `2026-05-16-staging-signoff`
Date: 2026-05-16
Timezone: Asia/Singapore
Status: signed off for next stage with accepted risks

## Verdict

| Area | Verdict | Basis |
| --- | --- | --- |
| Staging acceptance | PASS WITH RISKS | R4 found no open P0, P1, or P2 defects. |
| Frontend to active backend | PASS WITH RISKS | Version evidence, static checks, browser smoke, and API integration passed. |
| Backend functional QA | PASS WITH RISKS | Full API runner passed with cleanup skips only. |
| WebSocket session invalidation | PASS | R4 confirmed active socket closes after security session revoke. |
| Full migration transfer | PASS | R4 confirmed table parity, asset parity, uploaded asset parity, and no failed assets. |
| Next stage | Approved | Proceed to production-readiness hardening. |

## Signed Candidate Evidence

| Component | Branch | Deployed commit | Runtime |
| --- | --- | --- | --- |
| Frontend | `Stagging` | `2cb3462c53b13af645290cb06bdd425ce93977f2` | `production` |
| Active backend | `Stagging` | `a53aea5abe44b01130c9a3d35b720237c8908af8` | `production` |
| Migration target backend | `Stagging` | `a53aea5abe44b01130c9a3d35b720237c8908af8` | `production` |

## QA Evidence

| Evidence | Result |
| --- | --- |
| `morneven-website/docs/STAGING_QA_POST_R3_RERUN_REPORT_2026-05-16-R4.md` | PASS WITH RISKS |
| `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-R4-FULL.json` | PASS, 65 pass, 3 skip |
| `morneven-backend/qa/reports/staging-targeted-QA-20260516-CODEX-STAGING-R4-TARGETED.json` | PASS, 14 pass |
| `morneven-backend/qa/reports/staging-websocket-QA-20260516-CODEX-STAGING-R4-WEBSOCKET.json` | PASS, 11 pass |
| `morneven-backend/qa/reports/staging-migration-QA-20260516-CODEX-STAGING-R4-MIGRATION.json` | PASS, 7 pass |
| `morneven-backend/qa/reports/staging-browser-QA-20260516-CODEX-STAGING-R4-BROWSER-SMOKE.json` | PASS, 6 pass |

## Accepted Risks

| Risk | Severity | Sign-off decision |
| --- | --- | --- |
| FE lint warnings | P3 | Accepted for staging. 13 warnings, 0 errors. |
| FE bundle size warning | P3 performance risk | Accepted for staging, tracked as production hardening. |
| BE audit low vulnerabilities | P4 dependency risk | Accepted for staging. 0 high and 0 critical. |
| Uploaded files lack direct per-object delete endpoint | P4 cleanup limitation | Accepted with storage cleanup workflow and residual documentation. |
| Local QA Node version below `>=24` | P3 parity warning | Accepted because deployed runtime evidence is production; CI and production must use Node `>=24`. |

## Conditions

Staging sign-off remains valid only while these conditions hold:

1. Frontend and backend deployed commits remain the signed candidate commits above.
2. No schema, seed, auth, storage, migration, WebSocket, or security behavior change is deployed without scoped QA rerun.
3. Production-readiness hardening items are tracked separately and do not reopen staging unless they change runtime behavior.
4. Any new P0, P1, or P2 issue found after sign-off pauses promotion until fixed or explicitly risk-accepted.

## Next Stage

Proceed to production-readiness hardening using:

- `morneven-website/docs/PRODUCTION_READINESS_HARDENING_PLAN_2026-05-16.md`

No additional staging QA rerun is required before entering production-readiness hardening unless a new deploy or configuration change occurs.
