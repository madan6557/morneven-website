# Morneven Staging QA Rerun Report

Date: 2026-05-16
Timezone: Asia/Singapore
Tester: Codex QA

## 1. Verdict

Final verdict: FAIL for full staging acceptance.

The current staging candidate is substantially healthier than the 2026-05-15 run. Static validation passes, FE health artifacts are now JSON, frontend browser QA passes, CORS passes, authenticated API flows pass, extraction completes, file object proxy works, and mutation cleanup is mostly complete.

Staging acceptance is still blocked by one contract-level auth defect: `guest@morneven.com` credential login still returns `401`, while the active QA documents state that guest credential login remains a production requirement in addition to `POST /api/auth/guest`.

If the owner formally removes guest credential login as a requirement, the verdict can be downgraded to PASS WITH RISKS because the guest endpoint flow works and the remaining issues are environment/configuration or accepted operational risks.

## 2. Target And Version Evidence

| Item | Value |
| --- | --- |
| Frontend URL | `https://morneven.com` |
| Backend URL | `https://morneven-backend-development.up.railway.app` |
| API base | `https://morneven-backend-development.up.railway.app/api` |
| Frontend branch | `Stagging` |
| Backend branch | `Stagging` |
| Local FE HEAD | `28234c158808a7f400437513c903cfecc540181b` |
| Local FE commit subject | `chore: update package dependencies and node/npm versions` |
| Local BE HEAD | `ace194be9e5b09dc46b6353c0d30ad944d404265` |
| Local BE commit subject | `feat(qa): enhance QA guide with Node.js runtime information and update login methods` |
| Frontend `/version` commit | `28234c158808a7f400437513c903cfecc540181b` |
| Backend `/version` commit | `ace194be9e5b09dc46b6353c0d30ad944d404265` |
| Frontend env from `/version` | `production` |
| Backend env from `/version` | `development` |

Frontend `/version` response:

```json
{
  "service": "morneven-website",
  "version": "0.0.0",
  "buildVersion": "0.0.0",
  "commitSha": "28234c158808a7f400437513c903cfecc540181b",
  "commit": "28234c158808a7f400437513c903cfecc540181b",
  "env": "production",
  "generatedAt": "2026-05-15T17:31:27.315Z"
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
    "commitSha": "ace194be9e5b09dc46b6353c0d30ad944d404265",
    "env": "development",
    "startedAt": "2026-05-15T17:33:06.074Z"
  }
}
```

## 3. Evidence Artifacts

| Artifact | Result |
| --- | --- |
| `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-RERUN.json` | Full API runner, 59 PASS, 3 FAIL, 3 SKIP |
| `morneven-backend/qa/reports/dev-api-qa-QA-20260516-CODEX-STAGING-RERUN.md` | Markdown report for full API runner |
| `morneven-backend/qa/reports/staging-targeted-QA-20260516-CODEX-STAGING-TARGETED.json` | Targeted verification, 21 PASS, 1 FAIL |
| `morneven-backend/qa/reports/staging-migration-QA-20260516-CODEX-STAGING-MIGRATION.json` | Migration key gate checks, 2 PASS |
| `morneven-backend/qa/reports/staging-browser-QA-20260516-CODEX-STAGING-BROWSER.json` | Browser route QA, 37 PASS |
| `morneven-backend/qa/reports/staging-cleanup-QA-20260516-CODEX-STAGING-CLEANUP.json` | Cleanup verification, 3 PASS, 2 SKIP |

Secret handling: owner-provided extraction and migration keys were used only as environment/request secrets. The secret values are not written in this report or raw artifacts.

## 4. Static Validation

| Area | Command | Result |
| --- | --- | --- |
| FE TypeScript | `node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit` | PASS |
| FE lint | `npm run lint` | PASS, 0 errors, 18 warnings |
| FE tests | `npm run test` | PASS, 3 files and 10 tests |
| FE build | `npm run build` | PASS |
| FE audit high | `npm audit --audit-level=high --json` | PASS, 0 vulnerabilities |
| BE build | `npm run build` | PASS |
| BE Prisma validate | `DATABASE_URL=postgresql://user:pass@localhost:5432/morneven npx prisma validate` | PASS |
| BE audit high | `npm audit --audit-level=high --json` | PASS for high and critical, 5 low findings remain |

Known static warnings:

- FE lint has 18 warnings: fast-refresh export warnings, one unused eslint-disable directive, and hook dependency warnings in `AuthContext.tsx` and `ChatPage.tsx`.
- FE tests emit Vite guidance to switch from `@vitejs/plugin-react-swc` to `@vitejs/plugin-react` because no SWC plugins are used.
- FE build warns that Browserslist data is 11 months old.
- FE build warns that the main JS chunk is `1,654.33 kB`, gzip `434.00 kB`, above the configured warning threshold.
- BE Prisma validate warns that `package.json#prisma` config is deprecated for Prisma 7.
- BE audit still reports 5 low transitive findings from the Google Cloud Storage dependency chain, with 0 high and 0 critical.

## 5. Environment Smoke

| Check | Result | Evidence |
| --- | --- | --- |
| Backend `/health` | PASS | `200`, `{"status":"ok","env":"development"}` |
| Backend `/ready` | PASS | `200`, `{"status":"ready"}` |
| Backend `/version` | PASS with config concern | `200`, commit `ace194be...`, env `development` |
| Backend `/api/health` | PASS | `200`, `{"status":"ok","env":"development"}` |
| Backend `/api/ready` | PASS | `200`, `{"status":"ready"}` |
| Backend `/api/version` | PASS with config concern | same commit and env as root `/version` |
| Backend `/v1/health` | PASS | `200` |
| Backend `/v1/ready` | PASS | `200` |
| Backend `/v1/version` | PASS with config concern | same commit and env as root `/version` |
| Frontend `/health` | PASS | `200`, JSON |
| Frontend `/ready` | PASS | `200`, JSON |
| Frontend `/version` | PASS | `200`, JSON commit metadata |
| Frontend SPA direct routes | PASS | `/`, `/home`, `/projects`, `/chat` render |
| CORS preflight | PASS | `204`, allow-origin `https://morneven.com`, credentials `true` |

Configuration concern:

- Backend reports `env: development`. The staging guide requires backend `NODE_ENV=production`. This is not an immediate functional failure in the tested flows, but it is a staging fidelity gap.

## 6. API QA Summary

Full runner command scope:

- Base URL: `https://morneven-backend-development.up.railway.app`
- Scope: full
- Destructive: enabled
- File upload: enabled
- Global state rollback: enabled
- Extraction: enabled

Full API runner result:

| Status | Count |
| --- | ---: |
| PASS | 59 |
| FAIL | 3 |
| SKIP | 3 |

Confirmed passing areas:

- Health and readiness.
- Missing-token negative auth.
- Author login and `/auth/me`.
- `POST /api/auth/guest`.
- Wrong-password negative login.
- Guest token denied PL7 management.
- PL6 and field RBAC checks for chat reconcile.
- PL7 chat reconcile.
- Projects read, create, update, delete.
- News create, update, delete.
- Lore create, update, delete.
- Gallery create and update.
- Gallery comment create.
- Chat message create, delete, empty-message validation, DM, and manual group create.
- Management request create.
- Notification create, read, delete.
- Map marker backup, update, rollback.
- File upload.
- Extraction job start.

Full runner failures and triage:

| ID | Severity | Area | Result | Triage |
| --- | --- | --- | --- | --- |
| STG-20260516-001 | P1 | Auth | `POST /api/auth/login` with `guest@morneven.com` returns `401` | Product or seed contract defect. Active docs require guest credential login support. |
| STG-20260516-002 | P3 | QA automation | Gallery reply test uses gallery item ID as comment ID, returns `404 Comment not found` | Automation defect. Targeted test using actual comment ID passes. |
| STG-20260516-003 | P3 | QA automation cleanup | Gallery comment cleanup uses gallery item ID as comment ID, returns `404 Not found` | Automation defect. Targeted cleanup using actual comment ID passes. |

Targeted API verification:

| Area | Result |
| --- | --- |
| Author login | PASS |
| Admin login | PASS |
| Guest credential login | FAIL, `401 Invalid credentials` |
| Guest endpoint login | PASS |
| Guest endpoint token denied PL7 pending count | PASS |
| Gallery create, comment, reply with actual IDs | PASS |
| Gallery reply, comment, item cleanup | PASS |
| Runner management residual cleanup check | PASS for previous residual |
| File object proxy read of uploaded file | PASS |
| Blocked HTML upload | PASS, `400 Blocked MIME type` |
| Extraction poll to completed | PASS |
| Extraction archive download | PASS |
| Extraction job delete | PASS |
| Storage cleanup report read-only | PASS |

## 7. Extraction And Migration

Extraction:

| Check | Result |
| --- | --- |
| Start DB extraction job | PASS, `202` |
| Poll extraction job | PASS |
| Reach completed status | PASS |
| Download completed archive | PASS |
| Delete extraction job | PASS |
| Cleanup verification for RERUN extraction job | PASS, job not present |

Migration:

| Check | Result |
| --- | --- |
| Correct migration key accepted before object validation | PASS, `422 Invalid object path` on intentionally invalid object path |
| Invalid migration key rejected | PASS, `403 Invalid migration key` |

Full migration transfer was not executed because no approved disposable target backend URL was provided. Running migration against the same staging backend or a production-like target would violate the migration safety rules.

## 8. Browser QA Summary

Browser QA target:

- Frontend: `https://morneven.com`
- Backend API expected target: `https://morneven-backend-development.up.railway.app/api`
- Account: `author@morneven.com`
- Tool: Playwright Chromium headless

Coverage:

| Viewport | Checks | Result |
| --- | ---: | --- |
| `390x844` mobile | 6 | PASS |
| `768x1024` tablet | 6 | PASS |
| `1366x768` desktop | 19 | PASS |
| `1920x1080` wide | 6 | PASS |
| Total | 37 | PASS |

Desktop route checklist:

- `/`
- `/auth`
- `/auth/password-reset/confirm`
- `/home`
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

## 9. Rate Limit Observation

During the first broad browser matrix attempt, backend global rate limit was exhausted:

```txt
Ratelimit-Limit: 1200
Ratelimit-Remaining: 0
Retry-After: 130
```

After waiting for reset, the optimized browser matrix passed with `37/37` checks. A post-run readiness check showed:

```txt
HTTP/1.1 200 OK
Ratelimit-Limit: 1200
Ratelimit-Remaining: 518
```

Assessment: the fix from 20 to 1200 removes the previous normal-route blocker, but aggressive automated browser matrices can still consume the shared global bucket quickly because image-heavy pages issue many authenticated object proxy requests. This is a QA/load risk, not a functional browser failure in the optimized matrix.

## 10. Cleanup And Residual Data

Cleanup verified:

| Artifact | Status |
| --- | --- |
| QA project | Deleted by API runner |
| QA news | Deleted by API runner |
| QA lore character | Deleted by API runner |
| QA gallery item | Deleted by API runner |
| QA targeted gallery comment and reply | Deleted by targeted run |
| QA chat message | Deleted by API runner |
| QA notification | Deleted by API runner |
| Map marker global state | Rolled back by API runner |
| Extraction job `9db310a8-3757-4fdc-9124-e10b2df9a6de` | Deleted, no longer present |
| Management request `1ec19def-f879-4363-85ab-857066c14893` | Final state `rejected`, reviewer `admin` |

Residual data:

| Residual | ID or path | Reason |
| --- | --- | --- |
| Manual chat group | `3f8c3692-9279-47a4-949d-3f27d4e54afa` | No hard-delete endpoint exists |
| Uploaded QA file | `uploads/1778866834569-86c86356-4f18-48d8-91be-c83cc5872209-QA-20260516-CODEX-STAGING-RERUN.txt` | No API delete endpoint exists |

## 11. Defects And Risks

| ID | Severity | Status | Area | Summary |
| --- | --- | --- | --- | --- |
| STG-20260516-001 | P1 | Open | Auth | Guest credential login requirement fails with `401 Invalid credentials`. |
| STG-20260516-002 | P2 | Open | Environment | Backend reports `env: development` while staging guide requires `NODE_ENV=production`. |
| STG-20260516-003 | P3 | Open | QA automation | Full runner still uses wrong gallery comment ID for reply and comment cleanup. Backend targeted flow passes. |
| STG-20260516-004 | P3 | Open | Performance/load | Heavy browser QA can consume the 1200 request global limit within one window. Optimized browser QA passes. |
| STG-20260516-005 | P3 | Open | Frontend maintainability | FE lint has 18 warnings. No errors. |
| STG-20260516-006 | P3 | Open | Frontend performance | Main JS bundle remains above warning threshold. |
| STG-20260516-007 | P4 | Accepted constraint | Data cleanup | Manual chat groups and uploaded files have no direct hard-delete API. |

## 12. Release Readiness

| Gate | Result |
| --- | --- |
| FE version evidence | PASS |
| BE version evidence | PASS |
| Static validation | PASS with warnings |
| FE audit high | PASS |
| BE audit high | PASS, low findings remain |
| Smoke endpoints | PASS |
| CORS | PASS |
| Auth core | PASS except guest credential login |
| Role and RBAC checks | PASS in tested matrix |
| Mutating CRUD | PASS |
| Destructive cleanup | PASS where API exists |
| File upload and object proxy | PASS |
| Extraction | PASS |
| Migration key gate | PASS |
| Full migration transfer | NOT RUN, no approved disposable target backend URL |
| Browser QA | PASS |
| WebSocket browser connection | PASS |
| Final staging acceptance | FAIL due open P1 |

## 13. Recommendation

Do not approve full staging acceptance until STG-20260516-001 is fixed or the requirement is formally removed from the QA guide.

Frontend integration can continue against the current staging backend for authenticated author/admin/personnel flows and for guest mode through `POST /api/auth/guest`. Do not rely on `guest@morneven.com` credential login until the contract is fixed or deprecated.

Before the next acceptance run:

1. Fix or formally remove guest credential login support.
2. Align backend `NODE_ENV` with the staging guide or document why `development` is intentional.
3. Fix the QA runner gallery comment ID extraction so full runner failures reflect backend defects only.
4. Provide a disposable target backend URL if full migration transfer must be validated.
