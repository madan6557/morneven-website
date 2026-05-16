# Morneven Staging QA Report

Date: 2026-05-15
Timezone: Asia/Singapore
Tester: Codex QA
Run IDs: `QA-20260515-CODEX-STAGING-FULL`, `QA-20260515-CODEX-STAGING-TARGETED-R2`, `QA-20260515-CODEX-STAGING-BROWSER-R2`, `QA-20260515-CODEX-STAGING-BROWSER-R3`

## 1. Verdict

Final verdict: FAIL for staging acceptance.

Core FE, BE, and browser flows are mostly operational, but staging acceptance is blocked by release evidence gaps, unresolved high dependency audit risks, and repeated rate-limit failures during normal QA route refresh patterns.

This is not a total system outage. Auth, major authenticated pages, content reads, content CRUD, WebSocket author connection, global map rollback, file upload, and most browser route checks passed. The candidate should not be promoted until the P1 and P2 items below are fixed or explicitly risk-accepted.

## 2. Target

| Item | Value |
| --- | --- |
| Frontend URL | `https://morneven.com` |
| Backend URL | `https://morneven-backend-development.up.railway.app` |
| API base | `https://morneven-backend-development.up.railway.app/api` |
| Frontend documented frozen commit | `28e656c2355887bf1fe99bf30045180137ee1764` |
| Backend documented frozen commit | `f7731a9f373d3e4612a8542cf075b4bd82cb41d3` |
| Actual local FE HEAD | `a70a7b2b8f10610f93b08a6ef40183b961902149` |
| Actual local BE HEAD | `feab64f518458bfc501b1927baafad619388312d` |
| Backend `/version` commit | `feab64f518458bfc501b1927baafad619388312d` |
| Frontend `/version` | SPA HTML, no JSON commit metadata |
| Frontend deployed asset evidence | Remote `index-By6QEQnX.js` SHA256 matched local `dist` SHA256 |

Frontend asset SHA256 evidence:

```txt
Remote JS: cea56daa3a1b23ab486798c0865286a385e52ae0f6013729091f6cb030e108f3
Local dist JS: cea56daa3a1b23ab486798c0865286a385e52ae0f6013729091f6cb030e108f3
```

## 3. Static Validation

| Area | Command | Result |
| --- | --- | --- |
| FE TypeScript | `node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit` | PASS |
| FE lint | `npm run lint` | PASS with 17 warnings |
| FE tests | `npm run test` | PASS, 3 files and 10 tests |
| FE build | `npm run build` | PASS with bundle size and Browserslist warnings |
| FE audit | `npm audit --audit-level=high` | FAIL, 19 vulnerabilities, 9 high |
| BE build | `npm run build` | PASS |
| BE Prisma validate | `npx prisma validate` | PASS with Prisma config deprecation warning |
| BE audit | `npm audit --audit-level=high` | FAIL, 6 vulnerabilities, 1 high |

Known warnings:

- FE lint: 17 warnings, mostly fast refresh export warnings plus 2 hook dependency warnings in `ChatPage.tsx`.
- FE build: main JS chunk is `1,832.87 kB`, above the 650 kB warning threshold.
- FE build: Browserslist data is 11 months old.
- BE Prisma: `package.json#prisma` config is deprecated for Prisma 7.

## 4. Environment Smoke

| Check | Result | Evidence |
| --- | --- | --- |
| Backend `/health` | PASS | `200`, `{"status":"ok","env":"development"}` |
| Backend `/ready` | PASS | `200`, `{"status":"ready"}` |
| Backend `/version` | PASS with mismatch | `200`, commit `feab64f...`, not documented frozen `f7731a...` |
| Backend `/api/health` | PASS | `200` |
| Backend `/api/ready` | PASS | `200` |
| Backend `/api/version` | PASS with mismatch | same commit `feab64f...` |
| Backend `/v1/health` | PASS | `200` |
| Backend `/v1/ready` | PASS | `200` |
| Backend `/v1/version` | PASS with mismatch | same commit `feab64f...` |
| Frontend `/` | PASS | `200`, SPA HTML |
| Frontend `/home` direct refresh | PASS | `200`, SPA HTML |
| Frontend `/projects` direct refresh | PASS | `200`, SPA HTML |
| Frontend `/chat` direct refresh | PASS | `200`, SPA HTML |
| Frontend `/health` | PASS with limitation | `200`, SPA HTML instead of JSON |
| Frontend `/ready` | PASS with limitation | `200`, SPA HTML instead of JSON |
| Frontend `/version` | PASS with limitation | `200`, SPA HTML instead of JSON |
| CORS preflight | PASS | `204`, allow-origin `https://morneven.com`, credentials `true` |

## 5. API QA

Primary runner:

```txt
morneven-backend/qa/dev-api-qa.mjs
```

Command:

```txt
node qa/dev-api-qa.mjs --base-url https://morneven-backend-development.up.railway.app --scope full --allow-destructive --include-file-upload --include-global-state --include-extraction --run-id QA-20260515-CODEX-STAGING-FULL
```

Runner report:

```txt
morneven-backend/qa/reports/dev-api-qa-QA-20260515-CODEX-STAGING-FULL.md
```

Runner result:

| Status | Count |
| --- | ---: |
| PASS | 54 |
| FAIL | 5 |
| BLOCKED | 1 |
| SKIP | 3 |

Manual triage of runner failures:

| Runner failure | Triage |
| --- | --- |
| Guest seed login returned `401` | Confirmed real mismatch. `POST /api/auth/guest` works, but documented `guest@morneven.com` seed login does not. |
| Guest RBAC blocked | Blocked because guest seed credential login failed. Guest endpoint is available. |
| PL6 executive chat reconcile returned `403` | Confirmed. Backend code requires PL7 author, PL7 admin, or security role. Docs and runner expect PL6 executive, so this is a contract mismatch. |
| Gallery reply and comment cleanup returned `404` | Runner ID extraction bug. Comment create returns full gallery detail, and runner extracted the gallery ID as comment ID. Manual API retest passed create comment, create reply, delete reply, delete comment, delete gallery. |
| Extraction job start returned `422` | Positive extraction request requires `secretKey`. QA input did not include the extraction secret, so the endpoint correctly rejected the request. |

Manual API retests:

| Area | Result |
| --- | --- |
| Author login | PASS, `200`, token returned |
| Guest seed login | FAIL, `401 Invalid credentials` |
| Guest endpoint | PASS, `200`, guest token returned |
| Gallery comment and reply flow | PASS, create and cleanup all returned `200` or `201` |
| Author chat reconcile | PASS, `200` |
| PL6 executive chat reconcile | FAIL by runner expectation, actual `403` |
| WebSocket valid author token | PASS, socket opened and emitted presence event |
| WebSocket invalid token | PASS for rejection behavior, connection errored and did not authenticate |
| Targeted backend validation | PASS, 45 targeted checks passed |

Raw QA artifacts retained:

| Artifact | Path |
| --- | --- |
| Full API runner JSON | `morneven-backend/qa/reports/dev-api-qa-QA-20260515-CODEX-STAGING-FULL.json` |
| Full API runner Markdown | `morneven-backend/qa/reports/dev-api-qa-QA-20260515-CODEX-STAGING-FULL.md` |
| Targeted backend JSON | `morneven-backend/qa/reports/staging-targeted-QA-20260515-CODEX-STAGING-TARGETED-R2.json` |
| Browser route JSON | `morneven-backend/qa/reports/staging-browser-QA-20260515-CODEX-STAGING-BROWSER-R2.json` |
| Browser retest JSON | `morneven-backend/qa/reports/staging-browser-QA-20260515-CODEX-STAGING-BROWSER-R3.json` |

## 6. Browser QA

Browser scope:

- Desktop: `1366x768`
- Tablet: `768x1024`
- Mobile: `390x844`
- Wide desktop: `1920x1080`
- Routes: public, auth, app shell, content, privileged modules, unknown route

Public route checks:

| Route | Result |
| --- | --- |
| `/` | PASS, landing rendered |
| `/auth` | PASS, login UI rendered |
| `/auth/password-reset/confirm` | PASS, confirmation form rendered |
| unknown route | PASS, 404 page rendered |

Authenticated author route checks:

| Route | Result |
| --- | --- |
| `/home` | PASS |
| `/projects` | PASS, but file proxy 429 console errors appeared during repeated responsive reloads |
| `/projects/proj-001` | PASS |
| `/gallery` | PASS |
| `/gallery/gal-001` | PASS |
| `/lore` | PASS |
| `/lore/characters/char-001` | PASS |
| `/lore/personnel` | PASS |
| `/maps` | PASS |
| `/author` | PASS |
| `/personnel` | PASS |
| `/security` | PASS |
| `/settings` | PASS |
| `/management` | PASS after auth limiter reset |
| `/chat` | PASS after auth limiter reset |

Responsive observations:

- Mobile `/home`, `/projects`, and `/chat` rendered without blank screens.
- Mobile app uses an `Open navigation` button and does not expose the desktop sidebar by default.
- No obvious overlapping critical text was detected in DOM or visible route snapshots.
- Repeated `/projects` checks logged file proxy `429` errors. Content still rendered with fallbacks, but media fetch reliability is at risk.

Console observations:

- Authenticated route checks were clean until route reloads exhausted `/auth/me` and file proxy limits.
- Unauthenticated direct access to guest surfaces logged `ApiError: Missing token` while rendering fallback UI. This is not a crash, but it adds noisy console errors.

## 7. Role And Permission Checks

| Check | Result |
| --- | --- |
| Author sidebar shows Management, Chat, Author Panel, Security, Personnel, Settings | PASS |
| Guest sidebar hides Management, Chat, Author Panel, Security, Personnel | PASS |
| Guest direct `/management` route shows locked state | PASS |
| Guest direct `/chat` route shows login-required state | PASS |
| PL6 field user blocked from chat reconcile | PASS, `403` |
| PL6 executive user blocked from chat reconcile | FAIL only if PL6 executive is still required by product contract |
| Author can run chat reconcile | PASS |

## 8. Cross-Flow And Mutation

| Area | Result | Cleanup |
| --- | --- | --- |
| Project create, update, delete | PASS | Deleted |
| News create, update, delete | PASS | Deleted |
| Lore character create, update, delete | PASS | Deleted |
| Gallery create, update, delete | PASS | Deleted |
| Gallery comment and reply | PASS after manual retest | Deleted |
| Chat message send and delete | PASS | Deleted |
| Chat DM create | PASS | Existing or created DM retained |
| Manual chat group create | PASS | Residual, no hard-delete endpoint |
| Management request create | PASS | Rejected for cleanup, retained as workflow history |
| Notification create, mark read, delete | PASS | Deleted |
| Map marker update and rollback | PASS | Rolled back |
| File upload | PASS | Residual, no direct file delete endpoint |
| Extraction | BLOCKED FOR POSITIVE START | Requires extraction `secretKey`; list and missing-secret negative validation passed |
| Migration | NOT EXECUTED | Requires disposable target and explicit high-risk approval |
| Storage cleanup execution | NOT EXECUTED | Report-only preferred first |

Residuals retained after cleanup:

| Artifact | ID or path | Reason |
| --- | --- | --- |
| Manual chat group | `f1901bc7-799a-4813-9c34-273789d427a9` | Backend has no hard-delete endpoint |
| Manual chat group | `d67e6e1a-a133-43e4-9e7d-f368856ba64d` | Backend has no hard-delete endpoint |
| Management request | `2a22e97e-5ffe-4445-88de-ade2f20acf1a` | Rejected by `admin`; backend retains workflow history |
| Management request | `506ce72c-f5f3-4dd9-a86b-a37ca06f80aa` | Rejected by `admin`; backend retains workflow history |
| Uploaded file | `uploads/1778845412026-8579918a-893c-44c8-99eb-231de4812a4c-QA-20260515-CODEX-STAGING-FULL.txt` | Backend has no direct file delete endpoint |
| Uploaded file | `uploads/1778845503408-a32f6e12-3201-41a6-a1cf-5b5587ccbfea-QA-20260515-CODEX-STAGING-RERUN.txt` | Backend has no direct file delete endpoint |

## 9. Defects And Risks

### STG-001 - P1 - Staging version evidence does not match documentation

Expected:

- Staging guide frozen backend commit: `f7731a9f373d3e4612a8542cf075b4bd82cb41d3`.
- Current system documentation backend commit: `f7731a9f373d3e4612a8542cf075b4bd82cb41d3`.
- Frontend version route should identify the deployed frontend commit, or equivalent deploy metadata must be captured.

Actual:

- Backend `/version` returns `feab64f518458bfc501b1927baafad619388312d`.
- Local backend HEAD is also `feab64f518458bfc501b1927baafad619388312d`.
- Frontend `/version` returns SPA HTML, not JSON metadata.
- Frontend remote bundle matches local build output, but the deployed frontend commit is not proven through a runtime endpoint.

Impact:

- The freeze gate cannot be cleanly signed off from the provided docs alone.
- QA is testing a newer deployed backend than the documented frozen backend commit.

Recommendation:

- Update staging docs with the actual frozen FE and BE commits.
- Expose frontend JSON `/version` on staging or attach deploy metadata to the QA record.

### STG-002 - P1 - FE and BE dependency audits still fail with high vulnerabilities

Expected:

- `npm audit --audit-level=high` passes, or risks are formally accepted.

Actual:

- FE audit: 19 vulnerabilities, 9 high.
- BE audit: 6 vulnerabilities, 1 high.

Impact:

- Production promotion remains blocked unless the owner explicitly risk-accepts the audit findings.

Recommendation:

- Fix dependency chain where possible.
- If staging must continue first, record written risk acceptance with owner and security scope.

### STG-003 - P2 - `/api/auth/me` rate limit can break direct route refresh QA and session validation

Expected:

- Staging route refresh matrix can run across authenticated routes without causing the user to be downgraded to Guest.

Actual:

- `/api/auth/me` exposes `ratelimit-limit: 20` and `ratelimit-policy: 20;w=900`.
- Repeated direct route reloads hit `429 RATE_LIMITED`.
- Browser session then cleared auth and rendered Guest state for `/management` and `/chat` until the limiter reset.

Evidence:

```txt
HTTP 429
ratelimit-limit: 20
ratelimit-policy: 20;w=900
retry-after: 764
{"success":false,"message":"Too many requests, please try again later.","errorCode":"RATE_LIMITED"}
```

Impact:

- QA route matrix is unstable.
- Users behind shared IPs or users who reload many app routes can be logged out or downgraded during active work.

Recommendation:

- Do not count `/auth/me` against the same tight auth mutation limiter, or raise the limit for session validation.
- Frontend should handle `429` from `/auth/me` without immediately clearing a valid local session if the token itself has not been rejected.

### STG-004 - P2 - File proxy rate limit produces media fetch `429` during responsive route checks

Expected:

- Content list media fetches should not hit file proxy limits during ordinary route browsing.

Actual:

- Repeated `/projects` checks logged:

```txt
Failed to fetch file from proxy: 429 {"success":false,"message":"Too many requests, please try again later.","errorCode":"RATE_LIMITED"}
```

Impact:

- Media can degrade during normal browsing or QA sweeps.
- Console becomes noisy even when page content renders with fallback.

Recommendation:

- Increase file proxy limit, cache object proxy responses, avoid redundant image fetches, or bypass proxy for public safe assets where appropriate.

### STG-005 - P2 - Documented guest seed credential is invalid

Expected:

- `guest@morneven.com` with `SeedPassword123` logs in, per staging guide seed matrix.

Actual:

- `POST /api/auth/login` for `guest@morneven.com` returned `401 Invalid credentials`.
- `POST /api/auth/guest` returned `200` with guest token.

Impact:

- Guest seed account coverage in the guide and runner is blocked.
- Guest Mode still works, so public guest behavior can continue through the guest endpoint.

Recommendation:

- Either seed the documented guest credential correctly or update the guide and runner to use `POST /api/auth/guest`.

### STG-006 - P2 - Chat reconcile permission contract mismatch

Expected:

- Backend QA guide says PL7 or PL6 executive can run `/api/chat/reconcile`.

Actual:

- `author@morneven.com` L7 author returned `200`.
- `v.kessler@morneven.com` L6 executive returned `403`.
- Backend code uses `hasPl7MaintenanceAccess`, which allows PL7 author, PL7 admin, or security role.

Impact:

- QA runner marks a failure.
- Product contract is ambiguous for System Chat Reconciliation.

Recommendation:

- Decide intended access policy.
- If PL7-only is correct, update the guide, FE copy, and runner.
- If PL6 executive should be allowed, update backend authorization.

### STG-007 - P3 - Frontend runtime health/version endpoints return SPA HTML

Expected:

- `/health`, `/ready`, and `/version` return JSON on the staging frontend when runtime evidence is required.

Actual:

- `https://morneven.com/health`, `/ready`, and `/version` return SPA HTML.

Impact:

- This is documented as possible for the current frontend host, but it weakens release evidence and automation.

Recommendation:

- Prefer Railway frontend static server with JSON endpoints for staging, or provide external deployment metadata in QA records.

### STG-008 - P3 - Browser console logs missing-token errors on unauthenticated direct app routes

Expected:

- Guest or unauthenticated fallback states should render without console error noise where failures are expected and handled.

Actual:

- Direct unauthenticated routes such as `/gallery`, `/lore`, `/maps`, `/chat`, and `/management` logged handled `ApiError: Missing token` messages while rendering fallback or locked UI.

Impact:

- Does not crash pages.
- Makes real console defects harder to spot during QA.

Recommendation:

- Treat expected missing-token paths as handled warnings or silent locked-state flows.

### STG-009 - P2 - Extraction QA payload and backend validation are misaligned

Expected:

- The staging guide and QA runner extraction payload should start a DB extraction job when extraction testing is enabled and required secrets are available.

Actual:

- `POST /api/settings/extractions` returned `422 Validation failed`.
- Response field error: `secretKey` is required.
- Runner payload included password and `confirmText`, but did not include `secretKey`.

Impact:

- Extraction cannot be accepted using the documented runner flow.
- No extraction artifact was created in this QA run.

Recommendation:

- Update the QA guide and runner with the required `secretKey` field, or update backend validation if `secretKey` is not intended.
- Re-run extraction only after explicit approval because it creates high-risk operational artifacts.

## 10. Acceptance Gate Summary

| Gate | Status |
| --- | --- |
| Environment health and readiness | PASS |
| Frozen version evidence | FAIL |
| FE static validation | PASS with audit failure and warnings |
| BE static validation | PASS with audit failure and warning |
| Smoke API | PASS |
| Full endpoint QA | PASS with confirmed product and contract defects listed above |
| Browser route QA | PASS with rate-limit defects |
| Role matrix | PASS with chat reconcile contract mismatch |
| Cross-flow CRUD | PASS |
| WebSocket | PASS for author, invalid token rejected |
| Cleanup | PASS where endpoints exist, residuals documented |
| Final staging acceptance | FAIL |

## 11. Recommended Next Actions

1. Fix or formally accept FE and BE audit findings.
2. Update staging documentation to the actual frozen commit SHAs, or redeploy the documented frozen commits.
3. Add frontend runtime version evidence for `https://morneven.com`.
4. Adjust `/api/auth/me` rate limiting and frontend 429 handling.
5. Adjust file proxy rate limiting or caching.
6. Fix guest seed credential mismatch or update the guide and runner.
7. Resolve chat reconcile authorization policy and update backend or QA docs accordingly.
8. Align extraction payload requirements before any extraction acceptance run.
9. Re-run full API QA and browser route QA after fixes.
