# Morneven Staging QA Rerun Report - 2026-05-16 R2

Date: 2026-05-16
Timezone: Asia/Singapore
Tester: Codex QA

## 1. Verdict

Final release-gate verdict: FAIL for formal staging acceptance.

Functional QA verdict for the active deployed URLs: PASS WITH RISKS.

The active staging deployment passed the full destructive backend runner, targeted Activity and cleanup checks, extraction end-to-end, migration key gate checks, CORS, static validation, and browser route QA. The previous guest credential blocker is closed under the updated 2026-05-16-r2 contract: canonical guest mode uses `POST /api/auth/guest`, and `guest@morneven.com` is treated as an optional registered PL0 account. In this rerun, both flows passed.

Formal staging acceptance remains blocked by release evidence gaps:

- Frontend `/version` exposes commit `853573acd88a3a0f6ea13034c7cabc0959713bc7`, while local `Stagging` HEAD is `152f7e7c6151a9a87027b43ca0bb66f9786ba6ac`.
- Backend `/version` exposes commit `622ff5b6ec0d09586b3ba2c30ebfdd4970b8b540`, which matches local backend `Stagging` HEAD, but backend still reports `env: development`.
- `STAGING_QA_GUIDE_2026-05-14.md` version `2026-05-16-r2` still lists old frozen development commits. The fix report says rerun should be after redeploy from branch `Stagging`, so the guide freeze table needs alignment with the actual intended candidate.

## 2. Source Documents

| Document | Version | Usage |
| --- | --- | --- |
| `morneven-website/docs/STAGING_QA_GUIDE_2026-05-14.md` | `2026-05-16-r2` | Main staging QA runbook |
| `morneven-website/docs/STAGING_QA_FIX_REPORT_2026-05-16.md` | `2026-05-16-r2` | Latest fix handoff and contract updates |

Key contract updates applied in this rerun:

- Guest mode production path is `POST /api/auth/guest`.
- `guest@morneven.com` is an optional registered PL0 account. If seeded, it must login and access Activity.
- Manual chat group hard-delete is now expected through `DELETE /api/chat/conversations/:id`.
- Activity is available for registered PL0 accounts but not for anonymous guest mode.
- Gallery comment and reply ID extraction in the QA runner should be fixed.
- Extraction and migration secrets are required but must not be written to reports.

## 3. Target And Version Evidence

| Item | Value |
| --- | --- |
| Frontend URL | `https://morneven.com` |
| Backend URL | `https://morneven-backend-development.up.railway.app` |
| API base | `https://morneven-backend-development.up.railway.app/api` |
| Frontend branch | `Stagging` |
| Backend branch | `Stagging` |
| Local FE HEAD | `152f7e7c6151a9a87027b43ca0bb66f9786ba6ac` |
| Local FE HEAD subject | `feat: refactor image handling and mention utilities; enhance chat group management` |
| Deployed FE commit from `/version` | `853573acd88a3a0f6ea13034c7cabc0959713bc7` |
| Deployed FE subject | `feat: enhance guest access handling and improve sidebar visibility logic` |
| Local BE HEAD | `622ff5b6ec0d09586b3ba2c30ebfdd4970b8b540` |
| Local BE HEAD subject | `Refactor code structure for improved readability and maintainability` |
| Deployed BE commit from `/version` | `622ff5b6ec0d09586b3ba2c30ebfdd4970b8b540` |
| Frontend env from `/version` | `production` |
| Backend env from `/version` | `development` |

Frontend `/version` response:

```json
{
  "service": "morneven-website",
  "version": "0.0.0",
  "buildVersion": "0.0.0",
  "commitSha": "853573acd88a3a0f6ea13034c7cabc0959713bc7",
  "commit": "853573acd88a3a0f6ea13034c7cabc0959713bc7",
  "env": "production",
  "generatedAt": "2026-05-15T22:47:02.843Z"
}
```

Backend `/version` response:

```json
{
  "success": true,
  "data": {
    "service": "morneven-backend",
    "version": "0.1.0",
    "buildVersion": "0.1.0",
    "commitSha": "622ff5b6ec0d09586b3ba2c30ebfdd4970b8b540",
    "env": "development",
    "startedAt": "2026-05-15T23:07:37.428Z"
  }
}
```

## 4. Evidence Artifacts

| Artifact | Result |
| --- | --- |
| `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-R2-FULL.json` | Full API runner, 66 PASS, 2 SKIP |
| `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-R2-FULL.md` | Markdown report for full API runner |
| `morneven-backend/qa/reports/staging-targeted-QA-20260516-CODEX-STAGING-R2-TARGETED.json` | Targeted auth, Activity, cleanup, file, migration checks, 11 PASS |
| `morneven-backend/qa/reports/staging-extraction-QA-20260516-CODEX-STAGING-R2-EXTRACTION.json` | Extraction start, poll, ticket, download, delete, 7 PASS |
| `morneven-backend/qa/reports/staging-browser-QA-20260516-CODEX-STAGING-R2-BROWSER.json` | Browser route QA, 41 PASS |

Secret handling:

- Owner-provided extraction and migration keys were used only as runtime secrets.
- Secret values are not written in this report.
- R2 artifacts were checked for the provided secret and JWT patterns after redaction.

## 5. Static Validation

| Area | Command | Result |
| --- | --- | --- |
| FE TypeScript | `node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit` | PASS |
| FE lint | `npm run lint` | PASS, 0 errors, 13 warnings |
| FE tests | `npm run test` | PASS, 3 files and 10 tests |
| FE build | `npm run build` | PASS |
| FE audit high | `npm audit --audit-level=high --json` | PASS, 0 vulnerabilities |
| BE build | `npm run build` | PASS |
| BE Prisma validate | `DATABASE_URL=postgresql://user:pass@localhost:5432/morneven npx prisma validate` | PASS |
| BE audit high | `npm audit --audit-level=high --json` | PASS for high and critical, 5 low findings remain |

Known static warnings:

- FE lint has 13 warnings: shadcn/ui fast-refresh export patterns, validation dialog helper exports, AuthContext hook export pattern, and ChatPage scroll hook dependency warnings.
- FE tests emit Vite guidance to switch from `@vitejs/plugin-react-swc` to `@vitejs/plugin-react` because no SWC plugins are used.
- FE build warns that the main JS chunk is `1,656.18 kB`, gzip `434.63 kB`, above the configured warning threshold.
- BE Prisma validate warns that `package.json#prisma` config is deprecated for Prisma 7.
- BE audit still reports 5 low transitive findings from the Google Cloud Storage dependency chain, with 0 high and 0 critical.

## 6. Environment Smoke

| Check | Result | Evidence |
| --- | --- | --- |
| Backend `/health` | PASS | `200`, JSON, `env: development` |
| Backend `/ready` | PASS | `200`, JSON |
| Backend `/version` | PASS with evidence gap | Commit `622ff5b...`, env `development` |
| Backend `/api/health` | PASS | `200`, JSON, `env: development` |
| Backend `/api/ready` | PASS | `200`, JSON |
| Backend `/api/version` | PASS with evidence gap | Same commit and env as root `/version` |
| Frontend `/health` | PASS | `200`, JSON |
| Frontend `/ready` | PASS | `200`, JSON |
| Frontend `/version` | PASS with evidence gap | Commit `853573a...`, not local FE `Stagging` HEAD |
| Frontend SPA direct routes | PASS | `/`, `/home`, `/projects`, `/chat` return SPA HTML |
| CORS preflight | PASS | `204`, allow-origin `https://morneven.com`, credentials `true` |
| Post-browser readiness | PASS | `200`, rate limit remaining `472` |

## 7. API QA Summary

Full runner command scope:

- Base URL: `https://morneven-backend-development.up.railway.app`
- Scope: full
- Destructive: enabled
- File upload: enabled
- Global state rollback: enabled
- Extraction start: enabled

Full API runner result:

| Status | Count |
| --- | ---: |
| PASS | 66 |
| SKIP | 2 |
| FAIL | 0 |

Confirmed passing areas:

- Health, readiness, and protected missing-token negative check.
- Author, PL7, PL6 executive, PL6 field, guest endpoint, and registered PL0 guest login.
- Anonymous guest mode denied Activity analytics.
- Registered PL0 guest allowed Activity analytics.
- Invalid password rejection.
- RBAC for PL7 management pending count and chat reconcile.
- Projects create, update, delete.
- News create, update, delete.
- Lore create, update, delete.
- Gallery create, update, comment, reply, reply delete, comment delete, item delete.
- Chat message create/delete, empty-message validation, DM create, manual group create, manual group hard-delete.
- Management request create.
- Notification create, read, delete.
- Map markers backup, update, rollback.
- File upload.
- Extraction job start.

Runner SKIP items:

| Item | Reason | Follow-up |
| --- | --- | --- |
| Management request cleanup note | Runner records residual instead of deciding request | Targeted cleanup verified request final state as not pending |
| Uploaded file cleanup note | No direct file delete endpoint | Residual listed below |

Targeted API verification:

| Area | Result |
| --- | --- |
| Author login | PASS |
| Admin login | PASS |
| Registered PL0 guest credential login | PASS |
| Guest endpoint login | PASS |
| Guest mode denied Activity analytics | PASS, `403 Registered account access required` |
| Registered PL0 guest can access Activity analytics | PASS |
| Management request final state | PASS, request no longer pending |
| File object proxy read of uploaded QA file | PASS |
| Blocked HTML upload | PASS, `400 Blocked MIME type` |
| Migration key accepted before object validation | PASS, `422 Invalid object path` |
| Invalid migration key rejected | PASS, `403 Invalid migration key` |

## 8. Extraction And Migration

Extraction:

| Check | Result |
| --- | --- |
| Start DB extraction job with key | PASS, `202` |
| Poll extraction job | PASS |
| Reach completed status | PASS |
| Create extraction download ticket | PASS |
| Download completed archive | PASS |
| Delete extraction job | PASS |

Migration:

| Check | Result |
| --- | --- |
| Correct migration key accepted before object validation | PASS, `422 Invalid object path` on intentionally invalid object path |
| Invalid migration key rejected | PASS, `403 Invalid migration key` |

Full migration transfer was not executed because no approved disposable target backend URL was provided. Running migration against the same staging backend or a production-like target would violate the migration safety rules.

## 9. Browser QA Summary

Browser QA target:

- Frontend: `https://morneven.com`
- Backend API expected target: `https://morneven-backend-development.up.railway.app/api`
- Account: `author@morneven.com`
- Tool: Playwright Chromium headless

Coverage:

| Viewport | Checks | Result |
| --- | ---: | --- |
| `390x844` mobile | 7 | PASS |
| `768x1024` tablet | 7 | PASS |
| `1366x768` desktop | 20 | PASS |
| `1920x1080` wide | 7 | PASS |
| Total | 41 | PASS |

Desktop route checklist:

- `/`
- `/auth`
- `/auth/password-reset/confirm`
- `/home`
- `/activity`
- `/projects`
- `/projects/proj-001`
- `/gallery`
- `/gallery/gal-001`
- `/lore`
- `/lore/characters/char-001`
- `/lore/personnel`
- `/maps`
- `/author`
- `/personnel`
- `/security`
- `/settings`
- `/management`
- `/chat`
- `/unknown-qa-route`

Responsive route checklist:

- `/`
- `/home`
- `/activity`
- `/projects`
- `/gallery`
- `/settings`
- `/chat`

Browser assertions:

| Assertion | Result |
| --- | --- |
| No blank screen | PASS |
| No page crash | PASS |
| No horizontal overflow detected | PASS |
| No console error captured | PASS |
| No request failure captured | PASS |
| No `429`, `5xx`, or authenticated API `4xx` captured | PASS |
| No production backend target | PASS |
| No `backend.dev.morneven.com` target | PASS |
| No localhost API target | PASS |
| WebSocket target uses staging backend | PASS |
| Protected file object requests use staging backend proxy | PASS |

Observed browser network targets were limited to the expected staging backend API and `wss://morneven-backend-development.up.railway.app/ws/chat?token=[REDACTED]`.

## 10. Cleanup And Residual Data

Cleanup verified:

| Artifact | Status |
| --- | --- |
| QA project | Deleted by full runner |
| QA news | Deleted by full runner |
| QA lore character | Deleted by full runner |
| QA gallery reply | Deleted by full runner |
| QA gallery comment | Deleted by full runner |
| QA gallery item | Deleted by full runner |
| QA chat message | Deleted by full runner |
| QA manual chat group | Deleted by full runner |
| QA notification | Deleted by full runner |
| Map marker global state | Rolled back by full runner |
| Management request `46efd105-a8cd-4545-b745-9e046739776c` | Final state verified as not pending |
| Extraction job `c3bf6df8-1dbf-44dc-8212-7339042fcd9e` | Deleted by extraction targeted run |

Residual data:

| Residual | ID or path | Reason |
| --- | --- | --- |
| Uploaded QA file | `uploads/1778886723426-13c72e38-adbe-4fda-a50c-107fc3f7bcf8-QA-20260516-CODEX-STAGING-R2-FULL.txt` | No direct file delete endpoint exists. Use storage cleanup flow if removal is required. |

## 11. Defects And Risks

| ID | Severity | Status | Area | Summary |
| --- | --- | --- | --- | --- |
| STG-R2-001 | P2 | Open | Release evidence | FE deployed commit `853573a...` is not local FE `Stagging` HEAD `152f7e7...`. |
| STG-R2-002 | P2 | Open | Release evidence | QA guide frozen commit table still lists old development commits, while fix report asks for `Stagging` rerun. |
| STG-R2-003 | P2 | Open | Environment | Backend reports `env: development` while staging guide requires `NODE_ENV=production`. |
| STG-R2-004 | P3 | Accepted for staging | Frontend maintainability | FE lint has 13 warnings, no errors. |
| STG-R2-005 | P3 | Accepted for staging | Frontend performance | Main JS bundle remains above warning threshold. |
| STG-R2-006 | P4 | Accepted constraint | Data cleanup | Uploaded files have no direct delete endpoint. |

Closed from previous rerun:

| Previous issue | R2 result |
| --- | --- |
| Guest credential login blocker | Closed. Registered PL0 guest credential login passed. |
| Guest mode contract ambiguity | Closed. `/api/auth/guest` canonical path passed and Activity denial passed. |
| Gallery reply runner ID bug | Closed. Reply create and cleanup passed in full runner. |
| Manual chat group hard-delete missing | Closed. Full runner deleted manual group through `DELETE /api/chat/conversations/:id`. |
| Extraction only started but not completed | Closed in targeted extraction run. |

## 12. Release Readiness

| Gate | Result |
| --- | --- |
| FE version evidence | FAIL, deployed FE is not latest local `Stagging` HEAD |
| BE version evidence | PASS for commit, FAIL for env fidelity |
| QA guide freeze table alignment | FAIL, guide still lists old development commits |
| Static validation | PASS with accepted warnings |
| FE audit high | PASS |
| BE audit high | PASS, low findings remain |
| Smoke endpoints | PASS |
| CORS | PASS |
| Auth core | PASS |
| Guest contract | PASS |
| Activity PL0 contract | PASS |
| Role and RBAC checks | PASS in tested matrix |
| Mutating CRUD | PASS |
| Destructive cleanup | PASS where API exists |
| File upload and object proxy | PASS |
| Extraction | PASS |
| Migration key gate | PASS |
| Full migration transfer | NOT RUN, no approved disposable target backend URL |
| Browser QA | PASS |
| WebSocket browser connection | PASS |
| Final functional verdict | PASS WITH RISKS |
| Final formal staging acceptance | FAIL until release evidence gaps are resolved |

## 13. Recommendation

Do not approve formal staging acceptance yet.

The active deployment is functionally usable for FE integration and broader staging work, but release-gate approval needs one of these decisions:

1. Redeploy frontend from current `Stagging` HEAD `152f7e7c6151a9a87027b43ca0bb66f9786ba6ac`, then rerun environment smoke and browser QA.
2. If `853573acd88a3a0f6ea13034c7cabc0959713bc7` is the intended FE candidate, update the QA guide frozen commit table and explicitly accept that local `Stagging` has a newer undeployed commit.
3. Set backend `NODE_ENV=production` for staging, or document why `development` is intentionally accepted for this staging environment.
4. Provide a disposable target backend URL if full migration transfer must be validated.
