# Morneven Current System Documentation

Last updated: 2026-05-14
Timezone: Asia/Singapore
Scope: current frozen system candidate for staging QA

## 1. System Version

| Component | Repository | Branch | Commit | Commit date | Commit subject |
| --- | --- | --- | --- | --- | --- |
| Frontend | `morneven-website` | `development` | `28e656c2355887bf1fe99bf30045180137ee1764` | 2026-05-13 23:04:40 +0800 | `ui(author): collapse editor sections` |
| Backend | `morneven-backend` | `development` | `f7731a9f373d3e4612a8542cf075b4bd82cb41d3` | 2026-05-13 22:41:01 +0800 | `feat(auth/personnel): extend account status and enforcement` |

Development is considered frozen while staging QA is running. New development work should wait until QA is complete, except approved P0 or P1 fixes.

## 2. Local Validation Snapshot

Validated on 2026-05-14.

| Component | Command | Result | Notes |
| --- | --- | --- | --- |
| Frontend | `node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit` | PASS | TypeScript app check passed |
| Frontend | `npm run test` | PASS | 3 files, 10 tests passed |
| Frontend | `npm run build` | PASS with warnings | Bundle built, main JS chunk is 1,806.13 kB, Browserslist data is 11 months old |
| Frontend | `npm run lint` | PASS with warnings | 0 errors, 17 warnings |
| Frontend | `npm audit --audit-level=high` | FAIL | 19 vulnerabilities, 9 high |
| Backend | `npm run build` | PASS | TypeScript build passed |
| Backend | `npx prisma validate` | PASS with warning | Schema valid, Prisma package config deprecation warning |
| Backend | `npm audit --audit-level=high` | FAIL | 6 vulnerabilities, 1 high |

Audit failures are staging risks and production blockers unless explicitly risk-accepted.

## 3. Architecture Overview

| Layer | Current implementation |
| --- | --- |
| Frontend runtime | Vite React TypeScript single-page app |
| Frontend routing | React Router with lazy-loaded route pages |
| Frontend deployment server | `server.mjs` static server with SPA fallback and `/health`, `/ready`, `/version` JSON endpoints |
| Backend runtime | Express TypeScript app compiled to `dist/src/server.js` |
| Backend deployment | Railway Nixpacks using `npm run build` and `npm run start:railway` |
| Database | PostgreSQL through Prisma |
| Auth | JWT access token, refresh token, optional auth cookies, session tracking |
| Realtime | Custom WebSocket endpoint at `/ws/chat` and `/ws` |
| Storage | `local`, `gcs`, or `s3` drivers |
| File upload | Multipart upload through backend with scan and object proxy |
| Security | Helmet, CORS allowlist, route rate limits, security gateway, audit logs, active blocks, security sessions |

## 4. Runtime URLs And API Targeting

### Frontend API target

The frontend reads `VITE_API_BASE_URL` at build time.

| Context | Default API target if `VITE_API_BASE_URL` is not set |
| --- | --- |
| `localhost`, `127.0.0.1`, `[::1]` | `http://localhost:3000/api` |
| `morneven.com` or `*.morneven.com` | `https://morneven-backend-production.up.railway.app/api` |
| Other host | Same-origin `/api` |

If `VITE_API_BASE_URL` ends with `/api` or `/v1`, the frontend uses it as-is. Otherwise, it appends `/api`.

Recommended staging value:

```txt
VITE_API_BASE_URL=https://<staging-backend-host>/api
```

Do not set this during staging unless explicitly testing fallback behavior:

```txt
VITE_DEMO_FALLBACK=true
```

### Backend prefixes

The backend exposes API routes under both:

```txt
/api
/v1
```

Health and version endpoints are available at root and under both prefixes:

```txt
/health
/ready
/version
/api/health
/api/ready
/api/version
/v1/health
/v1/ready
/v1/version
```

## 5. Build And Run Commands

### Frontend local development

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-website"
npm ci
$env:VITE_API_BASE_URL="http://localhost:3000/api"
npm run dev
```

Default local frontend URL:

```txt
http://localhost:5173
```

### Frontend validation

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-website"
node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit
npm run lint
npm run test
npm run build
```

### Frontend staging build

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-website"
$env:VITE_API_BASE_URL="https://<staging-backend-host>/api"
$env:BUILD_VERSION="staging-2026-05-14-28e656c"
$env:BUILD_COMMIT_SHA="28e656c2355887bf1fe99bf30045180137ee1764"
npm run build
$env:PORT="8080"
npm start
```

### Backend local development

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-backend"
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Default local backend URL:

```txt
http://localhost:3000
```

### Backend validation

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-backend"
npm run build
npx prisma validate
npm audit --audit-level=high
```

### Backend staging run

```powershell
cd "D:\MiKy LiRa\Project\Morneven Project\Website\morneven-backend"
$env:NODE_ENV="production"
$env:BUILD_VERSION="staging-2026-05-14-f7731a9"
$env:BUILD_COMMIT_SHA="f7731a9f373d3e4612a8542cf075b4bd82cb41d3"
npm run build
npm run start:railway
```

## 6. Environment Variables

### Frontend

| Variable | Required | Recommended staging value | Notes |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes for staging | `https://<staging-backend-host>/api` | Build-time API target |
| `VITE_DEMO_FALLBACK` | No | unset or `false` | Must not be enabled for staging acceptance |
| `PORT` | Runtime only | Railway-provided or `8080` | Used by `server.mjs` |
| `NODE_ENV` | Runtime only | `production` | Used in `/version` and `/health` |
| `BUILD_VERSION` | Recommended | `staging-2026-05-14-28e656c` | Exposed by `/version` |
| `BUILD_COMMIT_SHA` | Recommended | FE commit SHA | Exposed by `/version` |

### Backend

| Variable | Required | Recommended staging value | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Staging PostgreSQL URL | Must not point to production during staging QA |
| `JWT_ACCESS_SECRET` | Yes | Secret, 16+ chars | Used for access tokens and fallback hash pepper |
| `JWT_REFRESH_SECRET` | Yes | Secret, 16+ chars | Used for refresh tokens |
| `NODE_ENV` | No | `production` | No `staging` enum exists, so use production-like mode |
| `PORT` | No | Railway-provided | Backend default is `3000` |
| `CORS_ORIGIN` | No | Staging frontend origin | Comma-separated exact origins |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Global limiter window |
| `RATE_LIMIT_MAX` | No | `200` | Global limiter max |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | `900000` | Auth limiter window |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Auth limiter max |
| `SECURITY_LEVEL` | No | `5` | Max security controls enabled |
| `SECURITY_BLOCK_TTL_MS` | No | `900000` | Default active block TTL |
| `SECURITY_RETENTION_DAYS` | No | `90` | Security retention |
| `SECURITY_HASH_PEPPER` | Recommended | Secret, 16+ chars | If omitted, uses `JWT_ACCESS_SECRET` |
| `FILE_SCAN_PROVIDER` | No | `none` or `mock` | `mock` can quarantine EICAR-like content |
| `AUTH_COOKIE_ENABLED` | No | `false` unless testing cookie mode | Bearer token remains baseline |
| `AUTH_COOKIE_DOMAIN` | No | staging parent domain if cookie mode is used | Optional |
| `MAX_UPLOAD_MB` | No | `20` | Upload size |
| `STORAGE_DRIVER` | No | `local`, `s3`, or `gcs` | Prefer persistent staging storage |
| `LOCAL_STORAGE_PATH` | No | `/data/storage` on Railway volume | Only for local driver |
| `LOCAL_STORAGE_BASE_PATH` | No | `/storage` | Static path for local driver |
| `S3_*` | Conditional | Complete S3 values | Required if `STORAGE_DRIVER=s3` |
| `GCS_*` | Conditional | Complete GCS values | Required if `STORAGE_DRIVER=gcs` |
| `MIGRATION_KEY` | Recommended | Secret, 16+ chars | Required for migration receive/assets |
| `BUILD_VERSION` | Recommended | `staging-2026-05-14-f7731a9` | Exposed by `/version` |
| `BUILD_COMMIT_SHA` | Recommended | BE commit SHA | Exposed by `/version` |

## 7. User Roles, Levels, And Access

### Roles

| Role | Meaning |
| --- | --- |
| `author` | Full author authority when PL7 |
| `admin` | Administrative PL7 user |
| `security` | Security manager role |
| `personel` | Normal personnel account |
| `guest` | Guest or external viewer |

### Personnel levels

| Level | General meaning |
| --- | --- |
| L0 | Guest or external access |
| L1 | Entry personnel |
| L2 | Junior personnel |
| L3 | Restricted lore threshold |
| L4 | Personnel management read and review surfaces |
| L5 | Senior personnel |
| L6 | Track-scoped authoring and moderation |
| L7 | Full authority, hidden top tier |

### Tracks

| Track | Short code | Typical access focus |
| --- | --- | --- |
| `executive` | `GOV` | News, lore, moderation, management |
| `field` | `OPS` | Places, creatures, field workflow |
| `mechanic` | `ENG` | Projects, technology lore |
| `logistics` | `LOG` | Logistics workflows and gallery participation |

### UI route access

| Route | Access behavior |
| --- | --- |
| `/` | Public landing |
| `/auth` | Public auth page |
| `/auth/password-reset/confirm` | Public password reset confirmation page |
| `/home` | App shell route, backend data requires valid auth for protected API calls |
| `/projects`, `/projects/:id` | Browse projects |
| `/gallery`, `/gallery/:id` | Browse gallery and discussions |
| `/lore`, `/lore/:category`, lore detail routes | Browse lore, with restricted blocks hidden unless level threshold is met |
| `/maps` | Browse map markers and image |
| `/author` | Requires author-panel access: L7 or L6 track-scoped access |
| `/personnel` | Visible for PL4+ |
| `/security` | Requires L7 `author`, L7 `admin`, or `security` |
| `/settings` | Visible in app shell, specific actions are backend-gated |
| `/management` | Hidden from guests |
| `/chat` | Hidden from guests |

### Author panel access

| Level and track | Author panel access |
| --- | --- |
| L7 | Full access |
| L6 executive | Broad authoring and moderation access |
| L6 field | Lore `places`, lore `creatures`, and own gallery uploads |
| L6 mechanic | Projects, lore `technology`, and own gallery uploads |
| L6 logistics | Own gallery uploads |
| L0 to L5 | No author panel access |

### Backend write rules

| Capability | Backend rule |
| --- | --- |
| News write | L7 or L6 executive |
| Project write | L7 or L6 mechanic/executive |
| Lore write | L7, L6 executive, or L6 track-matched category |
| Gallery write | L6+ non-guest |
| Discussion moderation | L7 or L6 executive |
| Extraction jobs | PL7 author only |
| Security console | Security manager, PL7 author, or PL7 admin |

## 8. Seed Accounts

Seed password for all listed accounts:

```txt
SeedPassword123
```

| ID | Username | Email | Role | Level | Track | Status |
| --- | --- | --- | --- | ---: | --- | --- |
| `psn-001` | `author` | `author@morneven.com` | `author` | 7 | `executive` | `active` |
| `psn-002` | `admin` | `admin@morneven.com` | `admin` | 7 | `executive` | `active` |
| `psn-003` | `v.kessler` | `v.kessler@morneven.com` | `personel` | 6 | `executive` | `active` |
| `psn-004` | `m.varga` | `m.varga@morneven.com` | `personel` | 6 | `field` | `active` |
| `psn-005` | `s.okafor` | `s.okafor@morneven.com` | `personel` | 6 | `mechanic` | `active` |
| `psn-006` | `h.kato` | `h.kato@morneven.com` | `personel` | 5 | `logistics` | `active` |
| `psn-007` | `t.bremmer` | `t.bremmer@morneven.com` | `personel` | 4 | `field` | `active` |
| `psn-008` | `r.alves` | `r.alves@morneven.com` | `personel` | 3 | `executive` | `active` |
| `psn-009` | `guest_visitor` | `guest@morneven.com` | `guest` | 0 | `executive` | `active` |
| `psn-010` | `j.huang` | `j.huang@morneven.com` | `personel` | 5 | `mechanic` | `active` |
| `psn-011` | `n.osei` | `n.osei@morneven.com` | `personel` | 4 | `logistics` | `active` |
| `psn-012` | `p.salim` | `p.salim@morneven.com` | `personel` | 3 | `field` | `active` |
| `psn-013` | `e.ravel` | `e.ravel@morneven.com` | `personel` | 2 | `logistics` | `active` |
| `psn-014` | `a.koval` | `a.koval@morneven.com` | `personel` | 2 | `mechanic` | `active` |
| `psn-015` | `i.stratos` | `i.stratos@morneven.com` | `personel` | 1 | `field` | `active` |
| `psn-016` | `y.tanaka` | `y.tanaka@morneven.com` | `personel` | 1 | `executive` | `active` |

## 9. Main User Guide

### 9.1 Login

1. Open the frontend URL.
2. Go to `/auth`.
3. Enter a seeded email and password.
4. After login, the app stores backend tokens in localStorage and loads `/auth/me`.
5. Non-guest users connect to WebSocket realtime and begin presence heartbeat.

### 9.2 Guest access

1. Use the guest option on `/auth` for accountless guest mode. If `guest@morneven.com` is seeded, it behaves as a registered PL0 guest account.
2. Guest users can browse public surfaces.
3. Guest users do not see Chat or Management in the sidebar.
4. Backend protected actions reject guest access.

### 9.3 Password reset

1. From `/auth`, submit a password reset request with identity proof.
2. A reviewer handles the request from Management.
3. After approval, open `/auth/password-reset/confirm`.
4. Confirm with the approved reset flow and then login with the new password.

Password length rule for registration and reset is 12 to 128 characters.

### 9.4 Command Center

1. Open `/home`.
2. The dashboard loads command center content from the backend.
3. It includes configured sections such as stats, projects, news, lore, gallery, and quick actions.
4. Author or admin users can adjust command center presets from the Author Panel or Settings surfaces.

### 9.5 Projects

1. Open `/projects`.
2. Use search, status filter, sort, and load-more pagination.
3. Open a project detail with `/projects/:id`.
4. Authors or authorized L6 users create and edit projects from `/author`.
5. Project comments and replies are backend-backed discussion records.

### 9.6 Gallery

1. Open `/gallery`.
2. Filter by type, search, sort, and load more.
3. Open detail with `/gallery/:id`.
4. Non-guest users can comment and reply.
5. Authorized users can create and edit gallery items from `/author`.
6. Media uploads use `/files/upload` and protected rendering uses `/files/object`.

### 9.7 Lore and Wiki

1. Open `/lore`.
2. Use category tabs for characters, places, technology, creatures, events, and other lore.
3. Search and sort within each category.
4. Open detail pages with routes such as `/lore/characters/:id`.
5. Restricted content blocks use markers such as `[L3+]...[/L3+]` and are hidden from users below the threshold.
6. Authorized users create and edit lore from `/author`.

### 9.8 Maps

1. Open `/maps`.
2. The page loads map image and markers from backend.
3. Authorized users can update map image and markers from `/author`.
4. QA must backup and rollback map state for mutation tests because map data is global.

### 9.9 News

1. News is shown from command center and detail routes such as `/news/:id`.
2. Authorized users create and edit news from `/author`.
3. Attachments can reference uploaded media or documents.

### 9.10 Author Panel

1. Open `/author`.
2. Available sections depend on role, level, and track.
3. Use section editors for projects, lore, gallery, map, homepage/command center, and news.
4. Upload fields send files to the backend.
5. Collapsible sections are available in the current UI candidate.

### 9.11 Personnel Management

1. Open `/personnel`.
2. Use search and filters for role, level, track, and account status.
3. Authorized users can create accounts, update profile fields, bulk update users, suspend, ban, restore, or archive accounts.
4. Personnel archival delete is a soft-delete style action intended to preserve orphaned content.
5. Status changes can revoke sessions and chat access.

### 9.12 Management

1. Open `/management`.
2. Users create workflow requests such as clearance, transfer, team change, submissions, and executive promotion.
3. Authorized reviewers decide pending requests.
4. Decisions can create side effects such as content creation, team update, quota update, notification, and chat sync.
5. Password reset request review is part of the current management workflow.

### 9.13 Chat

1. Open `/chat`.
2. Conversations are backend-backed and include institute, division, team, DM, and manual group chats.
3. Users can send messages, attachments, replies, mentions, and read-state updates.
4. Manual groups support invite, accept, reject, kick, leave, role change, and rename.
5. System-managed groups are created and reconciled by the backend. Frontend should read them, not create them manually.
6. Realtime uses `/ws/chat`, with REST as the durable source of truth.

### 9.14 Notifications

1. Use the notification bell in the app header.
2. Notifications include direct and broadcast notifications.
3. Unread counts feed the bell and sidebar badges.
4. Users can mark single notifications read, mark all read, and delete supported notifications.

### 9.15 Settings

1. Open `/settings`.
2. Available maintenance actions depend on backend permissions.
3. Current surfaces include personnel reports, chat reconciliation, command center settings, extraction, migration, and storage cleanup.
4. Extraction and migration are high-risk operations and should be disabled during ordinary user acceptance unless specifically approved.

### 9.16 Security Console

1. Open `/security` as PL7 author, PL7 admin, or security role.
2. Review security status, event logs, active blocks, sessions, and file scans.
3. Authorized users can revoke security blocks and sessions.
4. Security telemetry is backend-backed.

## 10. Frontend Route Matrix

| Route | Page | Primary data source | Notes |
| --- | --- | --- | --- |
| `/` | Landing | Static frontend | Public route |
| `/auth` | Auth | Backend auth API | Login, register, guest, reset request |
| `/auth/password-reset/confirm` | Password reset confirm | Backend auth API | Approved reset confirmation |
| `/home` | Command Center | `/command-center` | Operational dashboard |
| `/projects` | Projects list | `/projects` | Search, filter, sort, load more |
| `/projects/:id` | Project detail | `/projects/:id` | Details and discussion |
| `/gallery` | Gallery list | `/gallery` | Type filter, search, sort, load more |
| `/gallery/:id` | Gallery detail | `/gallery/:id` | Comments and replies |
| `/lore` | Lore index | `/lore/:category` | Category tabs |
| `/lore/:category` | Lore category | `/lore/:category` | Category list |
| `/lore/characters/:id` | Character detail | `/lore/characters/:id` | Restricted blocks possible |
| `/lore/places/:id` | Place detail | `/lore/places/:id` | Restricted blocks possible |
| `/lore/tech/:id` | Technology detail | `/lore/technology/:id` | Route label differs from API category |
| `/lore/creatures/:id` | Creature detail | `/lore/creatures/:id` | Restricted blocks possible |
| `/lore/other/:id` | Other lore detail | `/lore/other/:id` | Restricted blocks possible |
| `/lore/events/:id` | Event detail | `/lore/events/:id` | Event lore |
| `/lore/personnel` | Personnel level guide | Static and app state | Explains PL model |
| `/maps` | Map | `/map/markers`, `/map/image` | Global data |
| `/author` | Author Dashboard | REST APIs | Permission-gated |
| `/personnel` | Personnel Management | `/personnel` | PL4+ UI visibility |
| `/security` | Security Console | `/security/*` | PL7 author/admin/security |
| `/settings` | Settings | `/settings/*` | Maintenance and utilities |
| `/news/:id` | News detail | `/news/:id` | News detail |
| `/management` | Management | `/management/*` | Hidden from guests |
| `/chat` | Chat | `/chat/*` and WebSocket | Hidden from guests |

## 11. Backend API Surface

Every endpoint group is mounted under `/api` and `/v1`.

| Group | Representative routes | Purpose |
| --- | --- | --- |
| Runtime | `GET /health`, `GET /ready`, `GET /version` | Health, DB readiness, build identity |
| Auth | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/guest`, `POST /auth/logout` | Authentication and sessions |
| Password reset | `POST /auth/password-reset/request`, `GET /auth/password-reset/requests`, `POST /auth/password-reset/requests/:id/review`, `POST /auth/password-reset/confirm` | Manual reset workflow |
| Projects | `GET /projects`, `GET /projects/:id`, `POST /projects`, `PUT /projects/:id`, `POST /projects/:id/archive`, `DELETE /projects/:id` | Project CRUD |
| Project discussion | Project comments and replies | Discussion records |
| Lore | `GET /lore/:category`, `GET /lore/:category/:id`, `POST`, `PUT`, `DELETE` | Lore CRUD |
| Lore discussion | Lore comments and replies | Discussion records |
| Gallery | `GET /gallery`, `GET /gallery/:id`, `POST`, `PUT`, `DELETE` | Gallery CRUD |
| Gallery discussion | `POST /gallery/:id/comments`, `POST /gallery/:id/comments/:commentId/replies` | Gallery discussion |
| News | `GET /news`, `GET /news/:id`, `POST`, `PUT`, `DELETE` | News CRUD |
| Map | `GET /map/markers`, `PUT /map/markers`, `GET /map/image`, `PUT /map/image` | Global map data |
| Files | `POST /files/upload`, `GET /files/object?path=...` | Upload and authenticated object proxy |
| Personnel | `GET /personnel`, lookup, heartbeat, reports, create, update, status, bulk, delete | Personnel management |
| Management | Requests, decisions, teams, quotas, pending count | Workflow approval system |
| Notifications | List, unread count, create, read, read all, delete | Notification inbox |
| Chat | Conversations, messages, invites, DM, groups, read state, unread count, reconcile | Chat system |
| Me | `GET /me/navigation-badges` | Sidebar badge aggregation |
| Content stats | `GET /content-stats` | Counts and dashboard support |
| Command center | `GET /command-center` | Homepage operational overview |
| Settings | Command center settings, presets, extraction, migration, storage cleanup | Maintenance operations |
| Security | Status, events, blocks, sessions, file scans, hash helper | Security console |

## 12. Realtime Behavior

| Topic | Behavior |
| --- | --- |
| Connection | Authenticated non-guest users connect to `/ws/chat?token=<token>` |
| Reconnect | Exponential backoff capped at 30 seconds |
| Presence heartbeat | Sent immediately after login, every 30 seconds, on focus, and on visibility restore |
| Chat events | Typing, read updates, message updates, and refresh triggers |
| Notifications | Backend emits notification update events |
| Personnel | Personnel changes can trigger UI refresh and session invalidation |
| Scope limitation | Current realtime and presence maps are process-local, so multi-instance deployment can split realtime state |

## 13. Data Loading, Lazy Loading, And Pagination

| Area | Current behavior |
| --- | --- |
| Route loading | All page routes are lazy-loaded with Suspense fallback |
| Projects | Search, filter, sort, `PROJECT_PAGE_SIZE = 24`, load-more pagination |
| Gallery | Responsive page size, type filter, sort, deferred search, load more |
| Lore | Responsive page size, tab-specific cache, deferred search, sort, load more |
| Author dashboard | Uses paged list patterns, `DASHBOARD_LIST_PAGE_SIZE = 25` |
| Command center selection | Uses paged selector lists |
| Discussions | Client-side visible slices for comments and replies |
| Chat messages | Fetches remote messages with pagination parameters, common page size 200 for current view |
| Security console | Client-side pages for events and sessions, file scans limited in UI |

## 14. Local Storage Keys

| Key | Purpose |
| --- | --- |
| `theme` | Light or dark theme |
| `auth_state` | Persisted frontend auth profile and password snapshot |
| `morneven_api_token` | Access token |
| `morneven_api_refresh_token` | Refresh token |
| `morneven_chat_last_read_v1` | Chat read tracking |
| `chat:scrollPositions` | Chat scroll restoration |
| `morneven_cc_settings` | Command center settings cache |
| `morneven_map_image` | Legacy map image helper key |
| `morneven_validation_suppressed_*` | Validation dialog suppression |

## 15. Storage, Upload, And File Access

Uploads are backend-owned.

| Step | Behavior |
| --- | --- |
| Upload | Frontend submits multipart file to `/files/upload?folder=<folder>` |
| Validation | Backend enforces max size and file scanning |
| Storage | Backend writes to configured storage driver |
| Response | Backend returns path, provider, location, URL, hash, size, and scan verdict |
| Read | Protected media can be read through `/files/object?path=<objectPath>` |

Readable object roots include:

```txt
gallery
lore
projects
news
map
chat
exports
uploads
```

There is no general direct uploaded-file delete endpoint. Staging QA must use approved storage cleanup or record residual uploads.

## 16. Extraction, Migration, And Storage Cleanup

| Operation | Access | Use case | Staging guidance |
| --- | --- | --- | --- |
| Extraction | PL7 author only | Create export ZIPs for DB and optional media | Run only with approval because artifacts consume storage |
| Migration | PL7 author plus `MIGRATION_KEY` for transfer endpoints | Receive and validate migration payloads/assets | Run only against disposable staging targets |
| Storage cleanup | Maintenance access | Detect and optionally remove orphaned storage objects | Report-only first, execute only after review |

## 17. Security Model

| Control | Current behavior |
| --- | --- |
| CORS | Exact-origin allowlist, credentials enabled |
| Helmet | Enabled |
| Rate limiting | Global limiter plus route-group limiters |
| Auth sessions | Security sessions are persisted and revocable |
| Active defense | Security blocks can deny subject hashes until TTL or revoke |
| File scanning | Allows safe media/docs, blocks SVG/HTML/executables/archives and MIME mismatch |
| Audit events | Security events record action, severity, decision, actor, and metadata |
| Security console | Shows status, events, active blocks, sessions, and file scans |

## 18. Known Limitations And Risks

| Area | Limitation or risk | Impact |
| --- | --- | --- |
| Dependency audit | FE and BE high vulnerabilities remain | Production blocker unless fixed or accepted |
| FE lint | 17 warnings remain | Not a functional blocker, should be tracked |
| FE bundle size | Main JS chunk is larger than 650 kB | Performance risk |
| Browserslist | Data is stale | Browser compatibility data should be refreshed |
| Realtime | Process-local WebSocket event maps | Multi-instance scaling can split realtime state |
| Manual chat groups | No hard-delete endpoint | QA cleanup leaves residual manual groups |
| Uploaded files | No general file delete endpoint | QA can accumulate storage residuals |
| Production backend live state | Public production root health responds but current `/api/version` was not verified as current in prior checks | Staging must use version endpoints before QA |
| Backend lockfile | Backend `.gitignore` ignores `package-lock.json` | Dependency resolution is less frozen for deployments |
| Frontend Vercel health | Vercel rewrite can return SPA HTML for `/health`, `/ready`, `/version` | Railway `server.mjs` is preferred when JSON health/version endpoints are required |

## 19. Operational Rules During Staging Freeze

| Rule | Requirement |
| --- | --- |
| Freeze scope | Freeze both FE and BE at the commits listed in section 1 |
| Allowed changes | QA docs, environment-only fixes, or approved P0/P1 fixes |
| Disallowed changes | New features, schema changes, dependency upgrades, route refactors, seed changes, UI redesign |
| Rebuild rule | Any rebuild must update `/version` metadata |
| QA reset rule | Any P0/P1 code fix resets affected QA scope |
| Mutation rule | Mutations are allowed only on staging, never production |
| Data rule | QA-created records must use a run ID prefix |
| Cleanup rule | Cleanup all supported QA data and document unsupported residuals |

## 20. Quick Reference

| Need | Use |
| --- | --- |
| Frontend health | `GET https://<frontend>/health` |
| Frontend readiness | `GET https://<frontend>/ready` |
| Frontend version | `GET https://<frontend>/version` |
| Backend health | `GET https://<backend>/health` |
| Backend readiness | `GET https://<backend>/ready` |
| Backend version | `GET https://<backend>/version` |
| Backend API health | `GET https://<backend>/api/health` |
| Backend API version | `GET https://<backend>/api/version` |
| Login | `POST /api/auth/login` |
| Current user | `GET /api/auth/me` |
| Navigation badges | `GET /api/me/navigation-badges` |
| WebSocket | `wss://<backend>/ws/chat?token=<token>` |
| File upload | `POST /api/files/upload?folder=<folder>` |
| File read | `GET /api/files/object?path=<objectPath>` |
