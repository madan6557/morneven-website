# Morneven Staging QA Guide

Document version: `2026-05-16-r3-handoff`
Last updated: 2026-05-16
Timezone: Asia/Singapore
Scope: full staging QA for the frozen current system version

## 1. Purpose

This document defines the staging QA process for the current Morneven system candidate.

The target of this QA cycle is not active development. Development is paused until QA is complete. Staging QA must validate the deployed frontend and backend commits captured from `/version` unless an approved P0 or P1 fix resets the affected scope.

Update label: 2026-05-16-r3-handoff

| Surface | Current staging URL |
| --- | --- |
| Frontend | `https://morneven.com` |
| Backend | `https://morneven-backend-development.up.railway.app` |
| API base | `https://morneven-backend-development.up.railway.app/api` |
| Chat WebSocket | `wss://morneven-backend-development.up.railway.app/ws/chat?token=<token>` |

| Component | Candidate source | Branch | Required evidence |
| --- | --- | --- | --- |
| Frontend | Latest redeployed staging candidate after R2 | `Stagging` | `/version` must return the deployed `Stagging` commit and `env: production` |
| Backend | Active staging backend candidate | `Stagging` | `/version` and `/api/version` must return the deployed backend commit and `env: production` |

R2 failed formal acceptance because the frontend deployment was older than the local `Stagging` candidate and the backend reported `env: development`. Owner has since confirmed FE redeploy and `NODE_ENV=production` for all relevant instances. Rerun must capture fresh version evidence instead of reusing R2 values.

## 2. QA Verdict Model

| Verdict | Meaning |
| --- | --- |
| PASS | Staging candidate is acceptable for release planning |
| PASS WITH RISKS | No P0/P1 defects, but accepted risks remain |
| FAIL | One or more P1/P2 defects block staging acceptance |
| BLOCKED | QA cannot continue because environment, auth, data, or deployment is unusable |

Production promotion must not be approved while any P0 is open. P1 issues require explicit written acceptance if deferred.

## 3. Freeze Rules

| Rule | Requirement |
| --- | --- |
| Freeze start | Freeze starts when both staging services expose matching `/version` commit SHA values |
| Allowed changes | QA docs, environment fixes, data cleanup, or approved P0/P1 fixes |
| Disallowed changes | New features, schema changes, seed changes, route changes, UI redesign, dependency upgrades |
| Rebuild rule | Every rebuild must update `BUILD_VERSION` and `BUILD_COMMIT_SHA` |
| Fix rule | Any code fix resets QA scope for the changed module and impacted cross-flows |
| Mutation rule | Mutation and destructive tests are allowed only on staging |
| Production rule | Production is read-only smoke only unless the project owner gives written approval |
| Data rule | QA-created data must include `QA-YYYYMMDD-<tester>-<feature>` in visible fields |
| Cleanup rule | All created records must be deleted or listed as residual with reason |

## 4. Staging Environment Requirements

### 4.1 Required URLs

| Variable | Example | Required |
| --- | --- | --- |
| `STAGING_FRONTEND_URL` | `https://morneven.com` | Yes |
| `STAGING_BACKEND_URL` | `https://morneven-backend-development.up.railway.app` | Yes |
| `STAGING_MIGRATION_TARGET_URL` | `https://morneven-backend-staging.up.railway.app` | Required only for full migration transfer QA |
| `QA_RUN_ID` | `QA-20260516-STAGING-R3` | Yes |
| `QA_EXTRACTION_KEY` | Match backend `EXTRACTION_KEY` | Required only for extraction QA |

Frontend staging must expose `/health`, `/ready`, and `/version` as JSON routes. If any of these paths return SPA HTML, record it as an environment failure before functional QA.
The migration target must expose `/health`, `/ready`, and `/version` with `env: production` before any full migration transfer is attempted.

### 4.2 Backend variables

| Variable | Required staging value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Isolated staging PostgreSQL URL |
| `JWT_ACCESS_SECRET` | Secret, 16+ chars |
| `JWT_REFRESH_SECRET` | Secret, 16+ chars |
| `CORS_ORIGIN` | `https://morneven.com`, optionally local QA origin |
| `SECURITY_LEVEL` | `5` |
| `SECURITY_BLOCK_TTL_MS` | `900000` |
| `SECURITY_RETENTION_DAYS` | `90` |
| `SECURITY_HASH_PEPPER` | Secret, 16+ chars |
| `FILE_SCAN_PROVIDER` | `none` or approved `mock` |
| `AUTH_COOKIE_ENABLED` | `false` unless cookie mode is in scope |
| `MAX_UPLOAD_MB` | `20` unless changed intentionally |
| `STORAGE_DRIVER` | `local`, `s3`, or `gcs` |
| `LOCAL_STORAGE_PATH` | `/data/storage` if using Railway volume |
| `LOCAL_STORAGE_BASE_PATH` | `/storage` |
| `MIGRATION_KEY` | Secret, 16+ chars |
| `BUILD_VERSION` | Staging build label from deploy |
| `BUILD_COMMIT_SHA` | Deployed backend commit SHA |

### 4.3 Frontend variables

| Variable | Required staging value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://morneven-backend-development.up.railway.app/api` |
| `VITE_DEMO_FALLBACK` | unset or `false` |
| `NODE_ENV` | `production` |
| Node.js runtime | `>=24` |
| `PORT` | Railway-provided or `8080` |
| `BUILD_VERSION` | Staging build label from deploy |
| `BUILD_COMMIT_SHA` | Deployed frontend commit SHA, preferably from `VERCEL_GIT_COMMIT_SHA` |

## 5. Pre-QA Setup Checklist

| Item | Status | Evidence required |
| --- | --- | --- |
| Backend staging service deployed | Pending | Railway deploy URL and deploy log |
| Frontend staging service deployed | Pending | Railway or approved staging URL |
| Backend `/version` returns frozen backend commit | Pending | JSON response captured |
| Frontend deploy version evidence matches frozen frontend commit | Pending | `/version` JSON if available, otherwise deploy metadata captured |
| Backend `/ready` returns `200` | Pending | JSON response captured |
| Backend `/api/ready` returns `200` | Pending | JSON response captured |
| Frontend `/health` or root load is healthy | Pending | JSON if Railway server, otherwise root SPA response captured |
| Staging CORS allows frontend origin | Pending | Response header captured |
| Staging database isolated from production | Pending | Railway service name or DB URL confirmation |
| Storage is persistent or intentionally local | Pending | Storage driver and volume/bucket confirmation |
| Seed accounts are present | Pending | Login smoke for `author@morneven.com` |
| Development freeze announced | Pending | QA run note |

## 6. Static Validation Commands

Run these before deploying or accepting a staging candidate.

### Backend

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-backend"
npm ci
npm run prisma:generate
npm run build
npx prisma validate
npm audit --audit-level=high
```

Expected:

| Command | Required result |
| --- | --- |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| `npm audit --audit-level=high` | PASS or accepted risk |

Current local snapshot on 2026-05-16-r3-handoff:

| Command | Current result |
| --- | --- |
| `npm run build` | PASS |
| `npx prisma validate` | PASS with Prisma config deprecation warning |
| `npm audit --audit-level=high` | PASS for high and critical, 5 low Google Cloud Storage transitive findings accepted for staging |

### Frontend

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-website"
npm ci
node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit
npm run lint
npm run test
npm run build
npm audit --audit-level=high
```

Expected:

| Command | Required result |
| --- | --- |
| TypeScript | PASS |
| Lint | 0 errors, warnings documented |
| Tests | PASS |
| Build | PASS |
| Audit | PASS or accepted risk |

Current local snapshot on 2026-05-16-r3-handoff:

| Command | Current result |
| --- | --- |
| TypeScript | PASS |
| `npm run lint` | PASS with 13 warnings, 0 errors |
| `npm run test` | PASS, 3 files and 10 tests |
| `npm run build` | PASS with bundle warning only |
| `npm audit --audit-level=high` | PASS, 0 vulnerabilities |

## 7. Smoke Test Order

Run this order exactly. Stop at the first P0 environment blocker.

| Order | Check | Command or route | Expected |
| ---: | --- | --- | --- |
| 1 | Backend root health | `GET $STAGING_BACKEND_URL/health` | `200`, JSON |
| 2 | Backend root ready | `GET $STAGING_BACKEND_URL/ready` | `200`, DB ready |
| 3 | Backend root version | `GET $STAGING_BACKEND_URL/version` | frozen BE commit |
| 4 | Backend API health | `GET $STAGING_BACKEND_URL/api/health` | `200`, JSON |
| 5 | Backend API ready | `GET $STAGING_BACKEND_URL/api/ready` | `200`, DB ready |
| 6 | Backend API version | `GET $STAGING_BACKEND_URL/api/version` | frozen BE commit |
| 7 | Frontend health | `GET $STAGING_FRONTEND_URL/health` | `200`, JSON |
| 8 | Frontend ready | `GET $STAGING_FRONTEND_URL/ready` | `200`, JSON |
| 9 | Frontend version | `GET $STAGING_FRONTEND_URL/version` | frozen FE commit |
| 10 | Frontend root | `GET $STAGING_FRONTEND_URL/` | SPA loads |
| 11 | Direct SPA route refresh | `/home`, `/projects`, `/chat` | no `404` |
| 12 | Author login | `POST /api/auth/login` | token and user returned |
| 13 | Auth me | `GET /api/auth/me` | current user returned |
| 14 | Core reads | projects, gallery, lore, map, news | all `200` |
| 15 | Operational reads | chat, notifications, badges, management | role-appropriate `200` |
| 16 | New modules | security, content-stats, command-center | role-appropriate `200` |
| 17 | WebSocket | `/ws/chat?token=<token>` | socket opens and emits ready |

## 8. Smoke Test Commands

```powershell
$env:STAGING_BACKEND_URL="https://morneven-backend-development.up.railway.app"
$env:STAGING_FRONTEND_URL="https://morneven.com"
$env:STAGING_MIGRATION_TARGET_URL="https://morneven-backend-staging.up.railway.app"
$env:QA_RUN_ID="QA-20260516-STAGING-R3"
$env:QA_SEED_PASSWORD="SeedPassword123"
```

```powershell
curl.exe -i "$env:STAGING_BACKEND_URL/health"
curl.exe -i "$env:STAGING_BACKEND_URL/ready"
curl.exe -i "$env:STAGING_BACKEND_URL/version"
curl.exe -i "$env:STAGING_BACKEND_URL/api/health"
curl.exe -i "$env:STAGING_BACKEND_URL/api/ready"
curl.exe -i "$env:STAGING_BACKEND_URL/api/version"
curl.exe -i "$env:STAGING_FRONTEND_URL/health"
curl.exe -i "$env:STAGING_FRONTEND_URL/ready"
curl.exe -i "$env:STAGING_FRONTEND_URL/version"
curl.exe -i "$env:STAGING_MIGRATION_TARGET_URL/health"
curl.exe -i "$env:STAGING_MIGRATION_TARGET_URL/ready"
curl.exe -i "$env:STAGING_MIGRATION_TARGET_URL/version"
```

```powershell
$loginBody = @{
  email = "author@morneven.com"
  password = "SeedPassword123"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$env:STAGING_BACKEND_URL/api/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody

$token = $login.data.token
$headers = @{
  Authorization = "Bearer $token"
  "X-Request-Id" = "$env:QA_RUN_ID-smoke"
}

Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/auth/me" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/projects?page=1&pageSize=5" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/news?page=1&pageSize=5" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/lore/characters?page=1&pageSize=5" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/gallery?page=1&pageSize=5" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/map/markers" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/chat/conversations" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/me/navigation-badges" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/content-stats" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/command-center" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$env:STAGING_BACKEND_URL/api/security/status" -Headers $headers
```

## 9. Seed Account Matrix

Use these accounts for staging QA after seeding.

| Account | Role | Level | Track | Password | Primary coverage |
| --- | --- | ---: | --- | --- | --- |
| `author@morneven.com` | `author` | 7 | executive | `SeedPassword123` | Full author, extraction, migration, security, personnel moderation |
| `admin@morneven.com` | `admin` | 7 | executive | `SeedPassword123` | Admin/security, personnel moderation, negative author-only extraction |
| `v.kessler@morneven.com` | `personel` | 6 | executive | `SeedPassword123` | L6 executive content, moderation, management review |
| `m.varga@morneven.com` | `personel` | 6 | field | `SeedPassword123` | Field authoring and restrictions |
| `s.okafor@morneven.com` | `personel` | 6 | mechanic | `SeedPassword123` | Mechanic authoring and restrictions |
| `h.kato@morneven.com` | `personel` | 5 | logistics | `SeedPassword123` | Mid-level negative author checks |
| `t.bremmer@morneven.com` | `personel` | 4 | field | `SeedPassword123` | Personnel visibility and review surfaces |
| `r.alves@morneven.com` | `personel` | 3 | executive | `SeedPassword123` | Restricted content threshold |
| `guest@morneven.com` | `guest` | 0 | executive | `SeedPassword123` | Optional registered PL0 guest account. If seeded, must login and access Activity. |
| `/api/auth/guest` | `guest` | 0 | executive | N/A | Canonical guest mode without password or account |
| `a.koval@morneven.com` | `personel` | 2 | mechanic | `SeedPassword123` | Low privilege negative checks |
| `i.stratos@morneven.com` | `personel` | 1 | field | `SeedPassword123` | Low privilege request flows |
| `y.tanaka@morneven.com` | `personel` | 1 | executive | `SeedPassword123` | Low privilege request flows |

## 10. Endpoint QA Matrix

### 10.1 Runtime

| Endpoint | Method | Auth | Expected |
| --- | --- | --- | --- |
| `/health` | GET | No | `200`, service status |
| `/ready` | GET | No | `200`, DB ready or `503` if DB down |
| `/version` | GET | No | Service, version, commit, env |
| `/api/health` | GET | No | Same as root |
| `/api/ready` | GET | No | Same as root |
| `/api/version` | GET | No | Same as root |

### 10.2 Auth

| Endpoint | Method | Scenario |
| --- | --- | --- |
| `/api/auth/register` | POST | Register QA user with valid 12+ char password |
| `/api/auth/login` | POST | Login seeded accounts |
| `/api/auth/refresh` | POST | Refresh token rotation |
| `/api/auth/me` | GET | Current user |
| `/api/auth/guest` | POST | Guest token |
| `/api/auth/logout` | POST | Revoke current session |
| `/api/auth/validate-token` | POST | Token validation |
| `/api/auth/password-reset/request` | POST | Submit manual reset request |
| `/api/auth/password-reset/requests` | GET | Reviewer queue |
| `/api/auth/password-reset/requests/:id/review` | POST | Approve or reject reset |
| `/api/auth/password-reset/confirm` | POST | Complete approved reset |
| `/api/auth/change-password` | POST | Change own password |
| `/api/auth/delete-account` | DELETE | Delete or archive own account if supported |

Negative tests:

| Case | Expected |
| --- | --- |
| Wrong password | `401` or validation error |
| Password shorter than 12 chars | validation error |
| Missing token on protected route | `401` |
| Guest token on protected route | `403` |
| Suspended/banned/deleted account login | blocked with dedicated error |

### 10.3 Content endpoints

| Group | Required coverage |
| --- | --- |
| Projects | list, detail, create, update, archive, delete, comments, replies |
| Lore | list/detail/create/update/delete for characters, places, technology, creatures, events, other |
| Lore discussion | create comment, create reply, moderate by owner and moderator |
| Gallery | list, detail, create, update, delete, comments, replies |
| News | list, detail, create, update, delete, attachment validation |
| Map | get/update markers, get/update image, rollback global state |

### 10.4 Operational endpoints

| Group | Required coverage |
| --- | --- |
| Files | upload safe file, reject blocked file type, object proxy read |
| Personnel | list, lookup, heartbeat, create, update, status, bulk, reports, archive delete |
| Management | create request, list own requests, pending count, decide, teams, quotas |
| Notifications | list, unread count, create, mark read, mark all read, delete |
| Chat | conversations, messages, edit/delete message, read state, unread counts, invites, DM, manual group, reconcile |
| Command Center | read current overview, verify enabled sections |
| Content Stats | read counts |
| Settings | command center settings, presets, extraction, migration, storage cleanup |
| Security | status, events, blocks, sessions, file scans, hash helper |
| WebSocket | authenticated connect, guest rejection, chat/read/presence/session events |

## 11. Frontend Browser QA Matrix

| Area | Required checks |
| --- | --- |
| Browsers | Chrome latest, Edge latest, Firefox latest if available |
| Viewports | `390x844`, `768x1024`, `1366x768`, `1920x1080` |
| Console | No uncaught runtime exceptions or infinite loading loops |
| Network | All API calls go to `https://morneven-backend-development.up.railway.app/api`, no `backend.dev.morneven.com`, no demo fallback |
| Auth | Login, reload session, refresh token behavior, logout |
| Navigation | Sidebar visibility matches role, level, and track |
| Mobile | Sidebar opens/closes, no horizontal overflow |
| Accessibility | Keyboard access, visible focus, dialogs dismissible, readable validation |
| Visual | No overlapping cards, clipped buttons, broken tables, unreadable text |
| Media | Images/files render through object proxy where protected |
| Realtime | Badges and chat update without hard refresh where implemented |

### Route smoke checklist

| Route | Account | Expected |
| --- | --- | --- |
| `/` | unauthenticated | Landing renders |
| `/auth` | unauthenticated | Login/register/reset UI renders |
| `/auth/password-reset/confirm` | unauthenticated | Confirmation form renders |
| `/home` | author | Dashboard renders |
| `/projects` | author | Project list renders |
| `/projects/proj-001` | author | Detail renders |
| `/gallery` | author | Gallery list renders |
| `/gallery/gal-001` | author | Detail renders |
| `/lore` | author | Lore tabs render |
| `/lore/characters/char-001` | author | Detail renders |
| `/lore/personnel` | author | Personnel level guide renders |
| `/maps` | author | Map renders |
| `/author` | author | Author Dashboard renders |
| `/personnel` | PL4+ | Personnel page renders |
| `/security` | author or admin | Security console renders |
| `/settings` | author | Settings renders |
| `/management` | non-guest | Management renders |
| `/chat` | non-guest | Chat renders |
| unknown route | any | NotFound renders |

## 12. Full Functional QA Matrix

| Module | Positive scenarios | Negative scenarios | Cleanup |
| --- | --- | --- | --- |
| Auth | login, register QA user, refresh, logout, guest login, change password | bad password, short password, missing token, guest denied | archive QA user |
| Password reset | create request, approve, confirm, login with new password | duplicate request, reject request, invalid confirm | approve or reject QA request |
| Projects | create, edit, archive, comment, reply, delete | invalid status, low role write, unknown ID | delete QA project |
| Lore | CRUD every category, restricted blocks, docs, comments | invalid category, low role write, malformed docs | delete QA lore |
| Gallery | create item, upload media, comment, reply, edit own, delete | non-owner edit, empty comment, invalid type | delete QA gallery item |
| News | create, detail, update, delete, attachments | low role write, invalid attachment | delete QA news |
| Map | backup, update marker/image, verify FE, rollback | invalid status, invalid coordinate, low role write | restore backup |
| Personnel | filters, create QA user, update, suspend, restore, bulk, report | self privilege escalation, PL7 target protected, deleted account blocked | restore or archive QA user |
| Management | clearance, transfer, team, submission, executive promotion, decisions | self approval, invalid kind, empty reason | reject unresolved QA requests |
| Chat | DM, manual group, invite, accept, reject, kick, leave, role, rename, message edit/delete | empty message, guest access, system group mutation | delete messages, leave QA group |
| WebSocket | two sessions, ready event, chat event, read event, session invalidation | guest socket rejected, revoked session closes | logout sessions |
| Notifications | direct and broadcast notification, read, read all, delete | cross-user delete denied | delete QA notifications |
| Security | status, events filter, create block, revoke block, revoke session | low role denied, invalid block payload | revoke QA blocks |
| Extraction | start approved job, poll, download, delete | non-author PL7 denied, wrong password | delete jobs/artifacts |
| Migration | start only against approved staging target | missing key, invalid target, production target blocked | retain report |
| Storage cleanup | report orphans, approved cleanup | non-author denied, no approval | document deleted paths |

## 13. Cross-Flow Scenarios

| ID | Scenario | Expected |
| --- | --- | --- |
| CF-01 | Author creates project in `/author`, then searches it in `/projects` | Project appears and detail loads |
| CF-02 | Mechanic PL6 creates project, field PL6 attempts same | Mechanic passes, field is blocked |
| CF-03 | Field PL6 creates creature lore, mechanic PL6 attempts creature lore | Field passes, mechanic is blocked |
| CF-04 | Gallery upload returns file path, gallery item uses it, object proxy renders it | Media persists after reload |
| CF-05 | Chat mention targets another user | Target receives notification and unread count increments |
| CF-06 | Management personal submission approved | Expected content or workflow side effect appears |
| CF-07 | Team request approved | Team state, quota, notification, and chat sync update |
| CF-08 | Personnel suspension of active user | Login blocked, session revoked, websocket closes |
| CF-09 | Personnel restore | User can login again |
| CF-10 | Manual password reset approved | User confirms and logs in with reset password |
| CF-11 | Security block created and revoked | Block appears, then becomes inactive |
| CF-12 | Map marker update | FE map reflects update, rollback restores original |
| CF-13 | Command Center preset activation | `/home` reflects active preset |
| CF-14 | Extraction job | Job completes, download works, cleanup removes record |
| CF-15 | Two active browser sessions | Realtime chat/read/notification events propagate |

## 14. Mutation And Destructive Test Rules

| Rule | Requirement |
| --- | --- |
| Target | Staging only |
| Run ID | Every record title, reason, group, file, and message must include `QA_RUN_ID` |
| Seed protection | Do not permanently delete or damage seed records |
| Global state | Map, command center, security blocks, extraction, migration, and cleanup require backup first |
| Personnel | Prefer creating QA accounts instead of modifying seed accounts |
| Status tests | Do not ban/delete `author`, `admin`, or security accounts |
| Extraction | Approval required before starting |
| Migration | Approval required and must target disposable staging only |
| Storage cleanup | Report-only first, execute only after object list review |
| Security blocks | Use QA-only subject values and short TTL |
| Chat groups | Manual group can be hard-deleted by group owner/admin; leave flow must promote the next active member by join order or delete the empty group |

## 15. Cleanup Guide

| Artifact | Cleanup |
| --- | --- |
| Project | `DELETE /api/projects/:id` |
| News | `DELETE /api/news/:id` |
| Lore | `DELETE /api/lore/:category/:id` |
| Gallery | `DELETE /api/gallery/:id` |
| Gallery comments | Delete through supported entity cleanup or delete parent item |
| Chat message | `DELETE /api/chat/messages/:id` |
| Manual chat group | `DELETE /api/chat/conversations/:id` for group admin delete, or `POST /api/chat/conversations/:id/leave` for leave and successor handoff |
| Management request | Decide as rejected if unresolved, record residual if no hard delete |
| Notification | `DELETE /api/notifications/:id` or bulk delete |
| Map | Restore exact pre-test payload |
| Personnel QA user | Restore status or archive delete |
| Password reset request | Approve to completion or reject |
| Extraction | Delete extraction jobs through settings endpoint |
| Uploaded files | No direct file delete, use approved storage cleanup or record residual |
| Security block | Revoke block |
| Security session | Logout or revoke session only for QA accounts |

## 16. Automated Backend QA Runner

The backend runner is:

```txt
morneven-backend/qa/dev-api-qa.mjs
```

Use staging base URL explicitly.

### Smoke

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-backend"
node qa/dev-api-qa.mjs --base-url $env:STAGING_BACKEND_URL --scope smoke --run-id "$env:QA_RUN_ID-SMOKE"
```

### Full functional with cleanup and upload

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-backend"
node qa/dev-api-qa.mjs `
  --base-url $env:STAGING_BACKEND_URL `
  --scope full `
  --allow-destructive `
  --include-file-upload `
  --run-id "$env:QA_RUN_ID-FULL"
```

### Full functional with global-state rollback

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-backend"
node qa/dev-api-qa.mjs `
  --base-url $env:STAGING_BACKEND_URL `
  --scope full `
  --allow-destructive `
  --include-file-upload `
  --include-global-state `
  --run-id "$env:QA_RUN_ID-GLOBAL"
```

### Extraction

Run only with approval.

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-backend"
$env:QA_EXTRACTION_KEY="<same value as backend EXTRACTION_KEY>"
node qa/dev-api-qa.mjs `
  --base-url $env:STAGING_BACKEND_URL `
  --scope full `
  --allow-destructive `
  --include-extraction `
  --run-id "$env:QA_RUN_ID-EXTRACTION"
```

Reports are written to:

```txt
morneven-backend/qa/reports/
```

## 17. Manual WebSocket Smoke

Minimum manual test:

1. Login as `author@morneven.com`.
2. Capture access token from login response or browser localStorage key `morneven_api_token`.
3. Connect to:

```txt
wss://morneven-backend-development.up.railway.app/ws/chat?token=<token>
```

Expected:

| Check | Expected |
| --- | --- |
| Valid author token | Socket opens |
| Guest token | Socket rejected |
| Invalid token | Socket rejected |
| First event | `socket.ready` |
| Second browser session sends chat message | First session receives relevant event or refresh trigger |
| Session revoked from security console | Revoked session receives invalidation and closes |

## 18. Defect Severity Rubric

| Severity | Definition | Examples |
| --- | --- | --- |
| P0 Blocker | QA cannot continue or system is unsafe | staging down, login impossible, DB migration corrupts staging, production target used for mutation |
| P1 Critical | Major feature, auth, permission, or data integrity issue | guest accesses management, PL6 modifies PL7, token refresh loop, session revoke does not block user |
| P2 Major | Important workflow fails but QA can continue | upload works but object proxy fails, create works but detail requires reload |
| P3 Minor | Low-risk UI or copy issue | typo, minor spacing, harmless warning |
| P4 Observation | Known limitation or accepted risk | no manual group hard-delete, no uploaded file delete endpoint |

## 19. Pass And Fail Gates

| Gate | Pass requirement |
| --- | --- |
| Environment | FE and BE health, ready, and version endpoints identify the frozen staging candidate |
| Static checks | FE typecheck, FE tests, FE build, BE build, Prisma validate pass |
| Lint | No errors, warnings documented |
| Audit | High vulnerabilities fixed or formally accepted as staging risk |
| Smoke | 100 percent P0 smoke routes pass |
| Endpoint QA | No untriaged `500`, `502`, auth bypass, or response-shape mismatch on priority endpoints |
| Browser QA | No blank screen, route crash, blocking console error, or mobile overflow |
| Role QA | Permission matrix matches FE and BE rules |
| Cross-flow | P0 cross-flow scenarios pass |
| Realtime | WebSocket smoke passes for auth, non-guest, and session invalidation |
| Cleanup | Supported QA-created data cleaned up, unsupported residuals listed |
| Final verdict | No open P0. No open P1 unless accepted. P2 list reviewed by owner |

## 20. QA Report Template

```txt
Run ID:
Date and timezone:
Tester:
Frontend URL:
Backend URL:
Frontend commit:
Backend commit:
Frontend version response:
Backend version response:
Database target:
Storage target:
Security level:
Mutation approved by:

Static checks:
Frontend typecheck:
Frontend lint:
Frontend tests:
Frontend build:
Frontend audit:
Backend build:
Backend Prisma validate:
Backend audit:

Smoke result:
Endpoint QA result:
Frontend browser result:
Role matrix result:
Cross-flow result:
WebSocket result:
Cleanup result:

Defects:
ID:
Severity:
Area:
Account:
Route or endpoint:
Steps:
Expected:
Actual:
Evidence:
Created data:
Cleanup status:
Owner:
Status:

Residual data:
Accepted risks:
Final verdict:
Approval:
```

## 21. Known Current Risks To Track In Staging

| Risk | Severity for staging | Required handling |
| --- | --- | --- |
| FE dependency audit high vulnerabilities | Closed | `npm audit --audit-level=high` returns 0 vulnerabilities |
| BE dependency audit high vulnerability | Closed for high/critical | 0 high and 0 critical; 5 low transitive Google Cloud Storage findings accepted for staging |
| FE lint warnings remain | Accepted P3 | 13 warnings remain, all fast-refresh library export patterns or ChatPage scroll hook dependency warnings |
| FE bundle size warning remains | Accepted P2/P3 performance risk | Monitor browser performance; code-splitting can be planned as production hardening |
| Browserslist stale warning remains | Closed | Browserslist DB refreshed and build no longer emits stale Browserslist warning |
| Realtime is process-local | Accepted P2 if scaled horizontally | Keep staging single-instance or accept limitation until multi-instance adapter exists |
| Uploaded files lack direct delete endpoint | Accepted P4 | Use storage cleanup scan/delete flow for orphaned upload objects |
| Manual chat group hard-delete missing | Closed | Manual groups can be deleted by group admin via `DELETE /api/chat/conversations/:id` |
| Frontend health endpoints return SPA HTML | Closed after redeploy | FE build generates `/health`, `/ready`, and `/version` artifacts |
| Backend package-lock is ignored | Closed | Backend `.gitignore` no longer ignores `package-lock.json`; npm lockfile is canonical |

## 22. Final Staging Acceptance Checklist

| Checklist | Status |
| --- | --- |
| Development freeze confirmed | Pending |
| Backend deployed from frozen commit | Pending |
| Frontend deployed from frozen commit | Pending |
| Backend version response captured | Pending |
| Frontend version response captured | Pending |
| Static validation completed | Pending |
| Smoke QA completed | Pending |
| Endpoint QA completed | Pending |
| Browser QA completed | Pending |
| Role matrix completed | Pending |
| Cross-flow QA completed | Pending |
| WebSocket QA completed | Pending |
| Mutation cleanup completed | Pending |
| Residual data listed | Pending |
| Accepted risks signed off | Pending |
| Final verdict assigned | Pending |
