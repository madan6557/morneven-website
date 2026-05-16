# Staging QA Rerun Report - 2026-05-16 R3

Document version: `2026-05-16-r3-qa-rerun`
Date: 2026-05-16
Timezone: Asia/Singapore
Tester: Codex QA Frontend
Run ID prefix: `QA-20260516-CODEX-STAGING-R3`

## Final Verdict

Verdict: `FAIL`

Active frontend and active backend staging are now deployed in `production` runtime mode and the main FE to BE functional surface is mostly healthy. However, full staging acceptance is blocked by two open P1 defects:

1. Full migration transfer completes but fails uploaded asset parity for two lore assets.
2. A live chat WebSocket remains open after its security session is revoked.

Conclusion: FE can render and operate against the active staging backend for normal functional smoke, but the system is not ready for BE integration sign-off or release planning until the P1 issues below are fixed or explicitly accepted by the owner.

## Environment Evidence

| Surface | URL | Result |
| --- | --- | --- |
| Frontend | `https://morneven.com` | `/health`, `/ready`, `/version` return JSON |
| Active backend staging | `https://morneven-backend-development.up.railway.app` | `/health`, `/ready`, `/version`, `/api/version` return JSON |
| Migration target | `https://morneven-backend-staging.up.railway.app` | `/health`, `/ready`, `/version` return JSON |
| CORS | FE origin to active backend | Preflight to `/api/auth/me` passed |

Version evidence:

| Component | Endpoint | Commit | Env |
| --- | --- | --- | --- |
| Frontend | `https://morneven.com/version` | `3a654d08cb9ca6ea012ab0c39b5c7c2dc4debf20` | `production` |
| Active backend | `/version` and `/api/version` | `fa5eef7117890d27cd2eb9634e59ce7234a617f4` | `production` |
| Migration target backend | `/version` | `fa5eef7117890d27cd2eb9634e59ce7234a617f4` | `production` |

Local branch HEADs matched the deployed version evidence at test time.

## Static Validation

| Check | Result | Notes |
| --- | --- | --- |
| Frontend TypeScript | PASS | `tsc -p tsconfig.app.json --noEmit` |
| Frontend lint | PASS with warnings | 0 errors, 13 existing warnings documented in handoff |
| Frontend tests | PASS | Vitest: 3 files, 10 tests |
| Frontend build | PASS with warnings | Vite build passed, chunk size warning remains |
| Frontend audit | PASS | 0 high vulnerabilities |
| Backend build | PASS | `npm run build` |
| Backend Prisma validate | PASS | Schema valid |
| Backend audit | PASS with accepted low risks | 0 high and 0 critical, 5 low transitive findings remain |

Local QA runtime note: local Node.js was `v22.12.0`, while the updated project requirement is Node `>=24`. This is a parity warning for local validation, not a deployed runtime failure.

## Runtime QA Results

| Area | Result | Evidence |
| --- | --- | --- |
| Full API runner | PASS with 2 SKIP cleanup notes | `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-R3-FULL.json` |
| Targeted role and permission QA | PASS | `morneven-backend/qa/reports/staging-targeted-QA-20260516-CODEX-STAGING-R3-TARGETED.json` |
| Extraction QA | PASS | `morneven-backend/qa/reports/staging-extraction-QA-20260516-CODEX-STAGING-R3-EXTRACTION.json` |
| Browser route and responsive QA | PASS | `morneven-backend/qa/reports/staging-browser-QA-20260516-CODEX-STAGING-R3-BROWSER.json` |
| WebSocket QA | FAIL | `morneven-backend/qa/reports/staging-websocket-QA-20260516-CODEX-STAGING-R3-WEBSOCKET.json` |
| Full migration transfer QA | FAIL | `morneven-backend/qa/reports/staging-migration-QA-20260516-CODEX-STAGING-R3-FULL-MIGRATION.json` |

Full API runner summary:

| Status | Count |
| --- | ---: |
| PASS | 66 |
| SKIP | 2 |

The two SKIP records are cleanup notes for unsupported hard-delete paths:

- Management request cleanup note: no hard-delete endpoint exists.
- Uploaded file cleanup note: no confirmed upload object delete endpoint exists.

Targeted QA summary:

| Status | Count |
| --- | ---: |
| PASS | 14 |

Key targeted checks passed:

- Author, admin, registered PL0 guest, and anonymous guest auth paths.
- Registered PL0 guest can access Activity overview.
- Anonymous guest mode cannot access Activity overview.
- Registered guest cannot access management pending count.
- Full-run management request residual is not pending.
- Uploaded file object proxy can read the uploaded object.
- HTML upload is blocked.
- Migration asset endpoint accepts a valid key before object validation and rejects invalid key.

Extraction QA summary:

| Status | Count |
| --- | ---: |
| PASS | 8 |

Extraction reached completed status, download ticket creation passed, archive download passed, and the extraction job was deleted.

Browser QA summary:

| Status | Count |
| --- | ---: |
| PASS | 41 |

Browser QA covered 20 desktop routes, 7 responsive routes, and 4 viewport profiles. No blank screen, route crash, blocking console error, bad API target, API 429/5xx failure, request failure, or horizontal overflow was recorded.

WebSocket QA summary:

| Status | Count |
| --- | ---: |
| PASS | 10 |
| FAIL | 1 |

Passed WebSocket checks:

- Valid author token opens chat WebSocket.
- First event includes `socket.ready`.
- Guest token is rejected.
- Invalid token is rejected.
- Sending a chat message emits `chat.message.created`.
- QA chat message cleanup passed.
- Security session revoke endpoint returned 200.

Failed WebSocket check is listed as `STG-R3-002`.

Migration QA summary:

| Status | Count |
| --- | ---: |
| PASS | 6 |
| FAIL | 1 |

Migration job completed and the target remained ready, but asset upload parity failed. Details are listed as `STG-R3-001`.

## Defects

### STG-R3-001 - Full Migration Fails Uploaded Asset Parity

Severity: P1 Critical
Area: Migration, storage asset transfer, data integrity
Status: Open

Steps:

1. Confirm migration target `/version` returns `env: production`.
2. Login as author.
3. Start full migration from active staging backend to `https://morneven-backend-staging.up.railway.app/api/settings/migration/receive`.
4. Poll migration job to completion.
5. Download migration report and compare table and asset parity.

Expected:

- `tablesMatch=true`
- `assetsMatch=true`
- `uploadedAssetsMatch=true`
- `failedAssets=0`

Actual:

- `tablesMatch=true`
- `assetsMatch=true`
- `uploadedAssetsMatch=false`
- `failedAssets=2`

Failed assets:

| Object path | Error |
| --- | --- |
| `lore/characters/char-007` | Source asset responded with 403 |
| `lore/characters/char-011` | Source asset responded with 403 |

Evidence:

- `morneven-backend/qa/reports/staging-migration-QA-20260516-CODEX-STAGING-R3-FULL-MIGRATION.json`
- Migration job ID: `3416c1b2-1b68-491a-b0d7-7e09dc27631e`

Impact:

Full migration cannot be accepted because target data does not have complete uploaded asset parity. This is a release gate if migration transfer is required for the current staging acceptance.

Cleanup status:

The migration target remained `/ready` after transfer. The target was overwritten as part of the approved full migration run.

### STG-R3-002 - Revoked Security Session Does Not Close Active WebSocket

Severity: P1 Critical
Area: Realtime, auth session invalidation, security
Status: Open

Steps:

1. Login as author and capture session A.
2. Open `wss://morneven-backend-development.up.railway.app/ws/chat?token=<redacted>` using session A.
3. Confirm socket opens and receives `socket.ready`.
4. Login as author with session B for security permission.
5. Revoke session A through `/api/security/sessions/:id/revoke`.
6. Wait for the open socket to receive `auth.session.invalidated` or close.

Expected:

The open WebSocket tied to the revoked security session should close or receive `auth.session.invalidated`.

Actual:

The revoke endpoint returned 200, but the open WebSocket stayed open for the 5 second verification window:

```txt
closed=false; invalidated=false; closeCode=none
```

Evidence:

- `morneven-backend/qa/reports/staging-websocket-QA-20260516-CODEX-STAGING-R3-WEBSOCKET.json`

Impact:

Security session revocation does not immediately invalidate an already open realtime connection. This leaves a revoked session able to retain a live WebSocket until the client disconnects or the server closes it by another path.

Cleanup status:

The QA chat message was deleted. The QA security session used for cleanup was revoked.

## Cleanup And Residuals

| Item | Status |
| --- | --- |
| API-created project/news/lore/gallery records | Cleaned by runner |
| Gallery comment and reply | Cleaned by runner |
| Chat message from full API runner | Cleaned by runner |
| WebSocket chat message | Cleaned by WebSocket QA |
| Manual QA group | Created and hard-deleted successfully |
| Extraction job | Deleted successfully |
| Global map state | Backed up, modified, and rolled back |
| Management request from full runner | Not pending after targeted verification |
| Uploaded QA object | Residual, no confirmed direct delete endpoint |
| Migration target data | Overwritten by approved full migration transfer |

Uploaded residual object:

```txt
uploads/1778909588828-b76de07c-c3b6-4b1b-908f-e89e692dbbb8-QA-20260516-CODEX-STAGING-R3-FULL.txt
```

## Accepted Risks Still Present

| Risk | Severity | Status |
| --- | --- | --- |
| FE lint warnings | P3 | 13 warnings, no lint errors |
| FE bundle size warning | P2/P3 | Build passes, chunk exceeds Vite warning threshold |
| BE audit low vulnerabilities | P4 | 5 low transitive findings remain, 0 high and 0 critical |
| Uploaded files lack direct delete endpoint | P4 | Residual object listed |
| Local Node version below project requirement | P3 | Local QA ran on Node 22.12.0, project now requires Node 24 or newer |

## Secret Handling

Migration and extraction keys were supplied by the owner and used only as runtime environment values. They were not written to this report.

Secret scan passed on the generated R3 evidence files for:

- The provided migration or extraction key value.
- JWT-like access or refresh tokens.

## Recommendation

Do not approve full staging acceptance yet.

Required fix before rerun:

1. Fix migration asset transfer for `lore/characters/char-007` and `lore/characters/char-011`, or document why those object paths are expected to be non-uploadable and adjust the migration parity contract.
2. Ensure security session revocation closes active WebSocket clients or emits `auth.session.invalidated` to the matching realtime client.

After the fixes, rerun at minimum:

- Version evidence.
- Full migration transfer QA.
- WebSocket auth and session invalidation QA.
- Browser smoke on `/chat`, `/settings`, and security routes.
- Targeted role/security regression checks.
