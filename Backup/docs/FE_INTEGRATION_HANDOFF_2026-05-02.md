# Morneven Frontend Integration Handoff

Date: 2026-05-02
Owner: Frontend
Target: Backend integration phase
Repository: `morneven-website`
Status: Ready for backend integration after QA fix pass

## 1. Executive Summary

Frontend has passed QA for integration readiness with no remaining P0, P1, or P2 defects after the latest fix pass.

Primary references:

- `docs/QA_FRONTEND_REPORT_2026-05-02.md`
- `docs/QA_FRONTEND_FIX_REPORT_2026-05-02.md`
- `docs/BE-REST-API-Requirement.md`
- `docs/sidebar-indicator-analyst-summary-2026-05-02.md`
- `docs/lazy-load-content-audit-2026-05-01.md`

Current frontend behavior is still demo-data driven. The UI is ready to connect to backend services, but data persistence, authentication authority, realtime state, file persistence, and workflow side effects must move to backend APIs during integration.

## 2. QA Status

Latest QA scope:

- Local production build smoke.
- Public deploy smoke.
- Auth validation.
- Route coverage.
- Permission guards.
- Responsive overflow checks.
- Selected CRUD checks.
- Seed detail route checks.

Latest fix status:

| Area | Status | Notes |
| --- | --- | --- |
| P0 blockers | Clear | None reported. |
| P1 blockers | Clear | None reported. |
| P2 defects | Fixed | Login inline validation now uses FE validation consistently. |
| P3 defects | Fixed | Social preview asset compatibility file added. |
| TypeScript | Pass | `tsc --noEmit` passed. |
| Lint | Pass with warnings | 13 existing warnings remain, no errors. |
| Tests | Pass | 3 files, 10 tests. |
| Production build | Pass | Build completed with non-blocking warnings. |

Known non-blocking warnings:

- Browserslist data is stale.
- Main JS chunk is larger than 650 kB after minification.
- Existing lint warnings are fast-refresh exports and hook dependency warnings.

## 3. Local Setup

Required runtime:

- Node.js compatible with the current lockfile and Vite 5 stack.
- npm.

Install dependencies:

```txt
npm install
```

Run development server:

```txt
npm run dev
```

Build production bundle:

```txt
npm run build
```

Preview production bundle:

```txt
npm run preview
```

Run validation:

```txt
node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit
npm run lint
npm test
npm run build
```

## 4. Frontend Stack

Core:

- React 18.
- TypeScript.
- Vite.
- React Router.
- TanStack Query is available for API-backed state.
- Tailwind CSS.
- shadcn-style Radix UI components.
- Lucide icons.
- Vitest and Testing Library.

Telemetry:

- Vercel Analytics.
- Vercel Speed Insights.

Important note:

Local static serving outside Vercel can show analytics script parse errors. Public deploy smoke did not show this issue, so it is treated as an environment-only observation.

## 5. Current Data Architecture

The frontend currently uses seed JSON and localStorage-backed services to simulate production behavior.

Services that must be migrated to backend-backed adapters:

| Module | Current FE source |
| --- | --- |
| Auth | `src/contexts/AuthContext.tsx` |
| Personnel | `src/services/personnelApi.ts` |
| Command Center | `src/services/commandCenterSettings.ts` |
| Projects | `src/services/projectsApi.ts` |
| Lore | `src/services/loreApi.ts` |
| Events | `src/services/eventsApi.ts` |
| Discussions | `src/services/discussionApi.ts` |
| Gallery | `src/services/galleryApi.ts` |
| News | `src/services/newsApi.ts` |
| Map | `src/services/mapApi.ts` |
| Management | `src/services/managementApi.ts` |
| Notifications | `src/services/notificationsApi.ts` |
| Chat | `src/services/chatApi.ts` |
| Content stats | `src/services/contentStatsApi.ts` |
| Settings extraction | `src/services/extractionService.ts` |

Adapter expectation:

- Page and component contracts should stay stable where possible.
- Backend adapters should unwrap the backend response envelope and return the current FE shapes to page code.
- API errors should be normalized before reaching UI components.
- The migration should be module-by-module to keep QA scope controlled.

## 6. Backend Contract Summary

Full backend contract is documented in `docs/BE-REST-API-Requirement.md`.

Global API expectation:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error expectation:

```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    { "path": "title", "message": "Required" }
  ]
}
```

Required backend paths during migration:

- `/api`
- `/v1`
- `/health`
- `/ready`

Recommended FE API client responsibilities:

- Attach access token.
- Refresh token or redirect on expired auth.
- Unwrap `data`.
- Normalize validation errors.
- Preserve permission failure semantics.
- Support abortable requests for large lists and route changes.

## 7. Integration Priority

Recommended integration order:

1. Auth and current user session.
2. Personnel and permission levels.
3. Projects, Gallery, Lore, Events, News, and Map read APIs.
4. Lazy-loaded high-volume content lists.
5. Discussions and comments.
6. Notifications and sidebar indicators.
7. Chat, invites, unread counts, and realtime updates.
8. Management workflow and request side effects.
9. Settings, command center, and PL7 extraction jobs.
10. File upload, file preview, and durable media storage.

Reasoning:

- Auth and personnel determine route access and visibility.
- Read APIs can be integrated with lower side-effect risk.
- Realtime and workflow modules should be integrated after identity, permissions, and base content are stable.

## 8. Routes And Feature Areas

Public and app routes covered by QA smoke include:

| Route | Purpose |
| --- | --- |
| `/` | Landing or entry route. |
| `/auth` | Login and register. |
| `/home` | Authenticated home dashboard. |
| `/projects` | Project list. |
| `/projects/:id` | Project detail. |
| `/gallery` | Gallery list. |
| `/gallery/:id` | Gallery detail. |
| `/lore` | Lore browser. |
| `/lore/characters/:id` | Character detail. |
| `/lore/places/:id` | Place detail. |
| `/lore/tech/:id` | Technology detail. |
| `/lore/creatures/:id` | Creature detail. |
| `/lore/events/:id` | Event detail. |
| `/lore/other/:id` | Other lore detail. |
| `/lore/personnel` | Personnel level page. |
| `/maps` | Map page. |
| `/news/:id` | News detail. |
| `/author` | Author dashboard. |
| `/management` | Management workflow. |
| `/chat` | Chat UI. |
| `/settings` | Settings and extraction tools. |

Permission-sensitive areas:

- `/author`
- `/management`
- `/chat`
- `/settings`
- PL-gated content and actions inside content pages.

## 9. Lazy Load And Large Data Readiness

Lazy load recommendations are documented in `docs/lazy-load-content-audit-2026-05-01.md`.

High-volume areas:

- Gallery list.
- Lore list by category.
- Projects list.
- News archive.
- Chat messages.
- Notifications.
- Management request lists.
- Extraction history.

Backend list APIs should support:

- Pagination or cursor pagination.
- Search query.
- Sort.
- Category or status filters.
- Permission-filtered results.
- Total or `hasMore` metadata.
- Stable item ids for incremental rendering.

FE expectations:

- Use skeleton or loading states for page-level and list-level loads.
- Do not block the whole page while appending more data.
- Abort stale requests on route or filter changes.
- Keep empty states and error states visible and actionable.

## 10. Sidebar Indicators And Notifications

Sidebar dot indicators have been implemented at UI level as navigation status indicators. They are not a replacement for the notification system.

Expected backend support:

- Aggregate endpoint for sidebar navigation indicators.
- Notification list endpoint.
- Read, unread, and dismiss actions.
- Realtime push or polling fallback for Chat and Management events.

Recommended aggregate shape:

```json
{
  "chat": {
    "hasNew": true,
    "unreadCount": 3
  },
  "management": {
    "hasNew": true,
    "pendingCount": 2
  },
  "notifications": {
    "hasNew": true,
    "unreadCount": 5
  }
}
```

Integration rule:

- Sidebar indicators should read aggregate state.
- Notification bell should read notification state.
- Chat unread state should be source-of-truth from chat service.
- Management pending state should be source-of-truth from workflow service.

## 11. System Chat Reconciliation

Settings now includes System Chat Reconciliation UI. The interface should be treated as production UI with demo data until backend integration.

Expected backend responsibilities:

- Detect missing required system chat groups.
- Detect stale system chat groups.
- Reconcile institute, division, and team chat rooms.
- Return dry-run preview before applying changes.
- Return execution result with created, updated, skipped, and failed counts.
- Keep an audit trail for PL7 or authorized operators.

Suggested endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/settings/system-chat-reconciliation` | Current reconciliation summary. |
| POST | `/api/settings/system-chat-reconciliation/preview` | Dry-run reconciliation preview. |
| POST | `/api/settings/system-chat-reconciliation/run` | Execute reconciliation. |
| GET | `/api/settings/system-chat-reconciliation/jobs/:id` | Job status and result. |

## 12. Auth And Permission Notes

Current FE auth is demo-mode. Backend integration must replace local authority.

Backend must provide:

- Login.
- Register.
- Logout.
- Refresh token.
- Current user profile.
- Permission level and role claims.
- Account status.

Important alignment item:

- Current demo login accepts a 6 character minimum password.
- Backend production policy may require stronger passwords.
- FE validation copy and minimum length must be aligned before live backend auth is enabled.

## 13. File And Media Notes

Current FE can present demo file previews and media references. Backend integration must provide durable media handling.

Backend requirements:

- Upload endpoint.
- Download or signed URL endpoint.
- MIME validation.
- Size limits.
- Permission checks.
- Thumbnail or preview metadata where needed.

Social preview asset:

- `public/opengraph-image.png` exists for compatibility.
- Current metadata points to `/android-chrome-512x512.png`.

## 14. Testing Checklist For Integration

Before connecting each module:

- Confirm endpoint path and response envelope.
- Confirm auth requirement.
- Confirm permission behavior.
- Confirm empty state.
- Confirm validation error mapping.
- Confirm loading and error UI.
- Confirm pagination behavior for list endpoints.

After connecting each module:

- Run TypeScript.
- Run lint.
- Run tests.
- Run production build.
- Smoke test affected route in desktop and mobile viewport.
- Verify no horizontal overflow.
- Verify logout and permission downgrade behavior.

Recommended command set:

```txt
node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit
npm run lint
npm test
npm run build
```

## 15. Risks To Track During Backend Integration

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Response shape mismatch | Runtime UI failures | Keep adapter layer and contract tests. |
| Permission mismatch | Incorrect route or action access | Validate PL matrix with backend claims. |
| Demo localStorage state conflicts | Stale state after integration | Add migration or clear demo keys on API mode. |
| Realtime unread drift | Bad sidebar badges | Use backend aggregate and event reconciliation. |
| Large list performance | Slow route and memory growth | Use cursor pagination and lazy load. |
| File preview mismatch | Broken gallery, chat, or extraction previews | Standardize media metadata. |
| Password policy mismatch | Failed auth QA | Align FE validation with BE policy before live auth. |

## 16. Analyst Specialist Summary

Frontend is ready to enter backend integration.

The UI surface has passed QA with no blocking defects after fix pass. Remaining items are integration risks, not frontend blockers. Backend integration should prioritize auth, personnel permission levels, content read APIs, large-list pagination, sidebar indicator aggregates, chat realtime state, management workflow side effects, and settings extraction or reconciliation jobs.

The most important analyst follow-up is to confirm the final backend contracts for:

- Auth and permission claims.
- Navigation indicator aggregate.
- Chat unread and invite lifecycle.
- Management request lifecycle.
- Lazy-loaded list pagination.
- File and media persistence.
- System chat reconciliation job states.

## 17. Handoff Decision

Decision: Proceed to backend integration.

Conditions:

- Keep current frontend QA report and fix report attached to the integration ticket.
- Treat demo data as placeholder only.
- Do not treat localStorage behavior as production persistence.
- Re-run QA after each backend module is connected.
- Re-run full QA before release candidate approval.
