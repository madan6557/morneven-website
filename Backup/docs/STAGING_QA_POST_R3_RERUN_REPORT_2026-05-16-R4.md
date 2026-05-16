# Morneven Staging QA Post R3 Rerun Report - 2026-05-16 R4

Document version: `2026-05-16-r4-post-r3-rerun`
Date: 2026-05-16
Timezone: Asia/Singapore
Tester: Codex QA
Run ID prefix: `QA-20260516-CODEX-STAGING-R4`

## Verdict

| Area | Verdict | Reason |
| --- | --- | --- |
| Active frontend to active backend | PASS WITH RISKS | Environment evidence, static validation, full API runner, targeted role/security checks, browser smoke, and WebSocket smoke passed. |
| Full migration transfer to staging target | PASS | Migration completed with table parity, asset parity, uploaded asset parity, and no failed assets. |
| R3 blocker closure | PASS | `STG-R3-001` and `STG-R3-002` are closed by R4 evidence. |
| Final staging acceptance | PASS WITH RISKS | No open P0 or P1 was found in this R4 scope. Existing accepted warnings remain. |

Summary: R4 validates the latest redeploys of frontend, active backend, and migration target. The two R3 blockers are closed. The system is ready to proceed to the next staging decision with accepted risks documented below.

## Reference Documents

| Document | Version |
| --- | --- |
| `morneven-website/docs/STAGING_QA_POST_R3_FIX_VALIDATION_2026-05-16.md` | `2026-05-16-post-r3-fix` |
| `morneven-website/docs/STAGING_QA_FIX_REPORT_2026-05-16.md` | `2026-05-16-post-r3-fix` |
| `morneven-website/docs/STAGING_QA_GUIDE_2026-05-14.md` | `2026-05-16-post-r3-fix` |
| `morneven-backend/QA_RAILWAY_TEST_GUIDE.md` | `2026-05-16-post-r3-fix` |
| `morneven-website/docs/STAGING_QA_RERUN_REPORT_2026-05-16-R3.md` | `2026-05-16-r3-qa-rerun` |

## Scope

R4 followed the post-R3 required rerun scope:

- Version evidence for frontend, active backend, and migration target.
- Static validation for frontend and backend.
- Full API runner against active backend staging.
- Targeted role and security regression.
- WebSocket auth and security session invalidation.
- Full migration transfer to `https://morneven-backend-staging.up.railway.app`.
- Browser smoke on `/chat`, `/settings`, and `/security`.

## Environment Evidence

| Surface | Endpoint | Result |
| --- | --- | --- |
| Active backend | `/health` | PASS, `200`, JSON, `env: production` |
| Active backend | `/ready` | PASS, `200`, JSON |
| Active backend | `/version` | PASS, commit `a53aea5abe44b01130c9a3d35b720237c8908af8`, `env: production`, `startedAt: 2026-05-16T06:23:43.067Z` |
| Active backend | `/api/health` | PASS, `200`, JSON, `env: production` |
| Active backend | `/api/ready` | PASS, `200`, JSON |
| Active backend | `/api/version` | PASS, commit `a53aea5abe44b01130c9a3d35b720237c8908af8`, `env: production` |
| Frontend | `/health` | PASS, `200`, JSON, `env: production`, `generatedAt: 2026-05-16T06:23:45.050Z` |
| Frontend | `/ready` | PASS, `200`, JSON, `env: production` |
| Frontend | `/version` | PASS, commit `2cb3462c53b13af645290cb06bdd425ce93977f2`, `env: production` |
| Migration target | `/health` | PASS, `200`, JSON, `env: production` |
| Migration target | `/ready` | PASS, `200`, JSON |
| Migration target | `/version` | PASS, commit `a53aea5abe44b01130c9a3d35b720237c8908af8`, `env: production`, `startedAt: 2026-05-16T06:23:42.157Z` |
| CORS | `OPTIONS /api/auth/login` from `https://morneven.com` | PASS, `204`, correct origin, credentials, methods, headers, and exposed `Content-Disposition` |

Local branch comparison:

| Component | Branch | Local HEAD | Deployed commit | Match |
| --- | --- | --- | --- | --- |
| Frontend | `Stagging` | `2cb3462c53b13af645290cb06bdd425ce93977f2` | `2cb3462c53b13af645290cb06bdd425ce93977f2` | PASS |
| Backend | `Stagging` | `a53aea5abe44b01130c9a3d35b720237c8908af8` | `a53aea5abe44b01130c9a3d35b720237c8908af8` | PASS |

## Static Validation

| Component | Check | Result |
| --- | --- | --- |
| Frontend | TypeScript, `tsc -p tsconfig.app.json --noEmit` | PASS |
| Frontend | Lint | PASS, 0 errors, 13 accepted warnings |
| Frontend | Tests | PASS, 3 files and 10 tests |
| Frontend | Production build | PASS with bundle size warning |
| Frontend | Audit high | PASS, 0 vulnerabilities |
| Backend | Build | PASS |
| Backend | Prisma validate | PASS with Prisma config deprecation warning |
| Backend | Audit high | PASS for high and critical, 5 low transitive findings remain |

Frontend build output:

- Main CSS: `99.04 kB`, gzip `17.04 kB`
- Main JS: `1,656.18 kB`, gzip `434.63 kB`
- Warning: one chunk remains above `650 kB`

## Runtime Artifacts

| Area | Artifact | Result |
| --- | --- | --- |
| Full API runner | `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-R4-FULL.json` | PASS, 65 PASS, 3 SKIP |
| Full API runner markdown | `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-R4-FULL.md` | Generated |
| Targeted role/security | `morneven-backend/qa/reports/staging-targeted-QA-20260516-CODEX-STAGING-R4-TARGETED.json` | PASS, 14 PASS |
| WebSocket | `morneven-backend/qa/reports/staging-websocket-QA-20260516-CODEX-STAGING-R4-WEBSOCKET.json` | PASS, 11 PASS |
| Migration | `morneven-backend/qa/reports/staging-migration-QA-20260516-CODEX-STAGING-R4-MIGRATION.json` | PASS, 7 PASS |
| Browser smoke | `morneven-backend/qa/reports/staging-browser-QA-20260516-CODEX-STAGING-R4-BROWSER-SMOKE.json` | PASS, 6 PASS |

## Full API Runner

Run ID: `QA-20260516-CODEX-STAGING-R4-FULL`

| Status | Count |
| --- | ---: |
| PASS | 65 |
| SKIP | 3 |
| FAIL | 0 |

Coverage highlights:

- Runtime health and readiness passed.
- Auth positive and negative checks passed.
- Registered PL0 guest login passed.
- Anonymous guest mode passed.
- Activity access rules passed.
- Chat reconcile permission rules passed.
- Projects, news, lore, gallery, discussion, chat, management, notifications, map rollback, and file upload checks passed.
- QA-created project, news, lore, gallery, discussion items, chat message, manual group, notification, and map mutation were cleaned or rolled back where supported.

SKIP notes:

| Item | Reason |
| --- | --- |
| Management request cleanup note | No hard-delete endpoint exists. Targeted R4 verified no pending QA R3/R4 management requests remain. |
| Uploaded file cleanup note | No direct upload object delete endpoint exists. |
| Extraction job skipped | Optional extraction was not enabled in the R4 full API runner. Extraction was not part of the post-R3 required rerun scope. |

## Targeted Role And Security Regression

Run ID: `QA-20260516-CODEX-STAGING-R4-TARGETED`

| Status | Count |
| --- | ---: |
| PASS | 14 |
| FAIL | 0 |

Checks passed:

- Author login.
- Admin login.
- Registered PL0 guest login.
- Anonymous guest mode login.
- Registered PL0 guest can access Activity overview.
- Anonymous guest mode cannot access Activity overview.
- Registered guest cannot access management pending count.
- Registered guest cannot access security status.
- Author can access security status.
- QA security block create and revoke passed.
- No pending QA R3 or R4 management requests remain.
- R4 uploaded file is readable through object proxy.
- Blocked HTML upload is rejected.

## WebSocket Rerun

Run ID: `QA-20260516-CODEX-STAGING-R4-WEBSOCKET`

| Status | Count |
| --- | ---: |
| PASS | 11 |
| FAIL | 0 |

R3 closure: `STG-R3-002` is closed.

Evidence:

- Valid author token opened WebSocket and emitted `socket.ready`.
- Chat message POST returned `201`.
- Open socket received `chat.message.created`.
- QA chat message cleanup returned `200`.
- Guest token was rejected by WebSocket.
- Invalid token was rejected by WebSocket.
- Security endpoint revoked the WebSocket session with `200`.
- Open WebSocket closed after security session revoke: `closed=true`.
- Cleanup security session revoke returned `200`.

Acceptance note:

- The socket closed after revoke. An explicit `auth.session.invalidated` message was not observed in this run, but closure satisfies the documented expected result of invalidated or closed.

## Migration Rerun

Run ID: `QA-20260516-CODEX-STAGING-R4-MIGRATION`
Migration job ID: `32e1ecdc-907f-4840-87e3-60514c0bcbfc`

| Status | Count |
| --- | ---: |
| PASS | 7 |
| FAIL | 0 |

R3 closure: `STG-R3-001` is closed.

Migration result:

| Check | Result |
| --- | --- |
| Target version production before transfer | PASS |
| Author migration login | PASS |
| Start full migration | PASS, `202` |
| Job reaches completed status | PASS |
| Download completed migration report | PASS, `200`, JSON |
| Table and asset parity | PASS |
| Target remains ready after transfer | PASS |

Parity details:

| Field | Value |
| --- | --- |
| `tablesMatch` | `true` |
| `assetsMatch` | `true` |
| `uploadedAssetsMatch` | `true` |
| `failedAssets` | `0` |
| Source asset count | `36` |
| Target uploaded asset count | `36` |

The previous R3 failed paths, `lore/characters/char-007` and `lore/characters/char-011`, no longer appear as failed assets.

## Browser Smoke

Run ID: `QA-20260516-CODEX-STAGING-R4-BROWSER-SMOKE`

| Status | Count |
| --- | ---: |
| PASS | 6 |
| FAIL | 0 |

Scope:

- Routes: `/chat`, `/settings`, `/security`
- Viewports: `390x844`, `1366x768`
- Account: `author@morneven.com`

Assertions passed:

- No blank page.
- No route crash.
- No bad API target.
- No API `429`, `4xx`, or `5xx` on expected authenticated route requests.
- No console error.
- No page error.
- No request failure.
- No horizontal overflow.
- WebSocket target remained `wss://morneven-backend-development.up.railway.app/ws/chat?token=[REDACTED]`.

## Defect Closure

| Defect | R3 Status | R4 Result | Closure |
| --- | --- | --- | --- |
| `STG-R3-001` Full migration fails uploaded asset parity | Open P1 | Migration parity passed with `uploadedAssetsMatch=true` and `failedAssets=0` | Closed |
| `STG-R3-002` Revoked security session does not close active WebSocket | Open P1 | Open WebSocket closed after `/api/security/sessions/:id/revoke` | Closed |

No new P0, P1, or P2 defect was found in this R4 rerun.

## Cleanup And Residuals

| Item | Status | Notes |
| --- | --- | --- |
| QA project, news, lore, gallery, comments, replies, chat message, manual group, notification | Cleaned | Full API runner cleaned supported records. |
| Map global state | Cleaned | Full API runner restored previous map state. |
| QA security block | Cleaned | Targeted runner revoked the QA security block. |
| WebSocket chat message | Cleaned | WebSocket runner deleted the QA message. |
| Management request `8f46db22-3fcd-4fe3-81d3-6e883e93e4e4` | Residual, not pending | No hard-delete endpoint exists. Targeted R4 verified no pending QA R3/R4 management requests remain. |
| Uploaded file `uploads/1778913134761-40794421-5b03-4a4b-a84e-7eb0dcd38f12-QA-20260516-CODEX-STAGING-R4-FULL.txt` | Residual | No direct upload object delete endpoint exists. Object proxy read passed. |
| Migration job `32e1ecdc-907f-4840-87e3-60514c0bcbfc` | Retained | Migration report retained as evidence. |

## Secret Handling

| Check | Result |
| --- | --- |
| Provided migration key in R4 artifacts | PASS, not found |
| JWT-like token scan in R4 artifacts | PASS, not found after redaction |
| Bearer token scan in R4 artifacts | PASS, not found |
| WebSocket token in artifacts | PASS, redacted |

## Accepted Risks

| Risk | Severity | Status |
| --- | --- | --- |
| Frontend lint warnings | P3 | Accepted for staging, 13 warnings and 0 errors |
| Frontend bundle size warning | P3 performance risk | Accepted for staging, production hardening item |
| Backend audit low vulnerabilities | P4 dependency risk | Accepted for staging, 0 high and 0 critical |
| Uploaded files lack direct per-object delete endpoint | P4 cleanup limitation | Accepted with residual documentation |
| Local Node version below `>=24` requirement | P3 parity warning | Local QA used Node 22.12.0, deployed runtime evidence is production |

## Final Recommendation

Approve the post-R3 rerun as `PASS WITH RISKS`.

The two R3 blockers are closed. The active frontend, active backend, and migration target all expose the latest redeployed commits in production runtime mode. Full migration transfer now passes asset parity, and revoked security sessions now close active WebSocket clients.

Recommended follow-up:

1. Keep the uploaded object residual on the storage cleanup list.
2. Keep the remaining FE lint warnings and bundle warning as production hardening items.
3. Keep BE low audit findings as accepted staging risk unless the dependency chain receives a safe latest-version fix.
