# Morneven Frontend REST API Integration Report

Date: 2026-05-03
Target backend: `https://backend.dev.morneven.com/api`
Status: REST API integration baseline implemented

## Summary

Frontend now has a centralized REST client and the main service layer uses backend APIs as the normal source of truth. Demo fallback is restricted to test mode or explicit `VITE_DEMO_FALLBACK=true`.

Implemented areas:

- Auth token login, register, guest login, logout, refresh, and current user lookup.
- Central response envelope unwrap and normalized API errors.
- Protected request header with `Authorization: Bearer <token>`.
- Content APIs for projects, gallery, lore, events, news, personnel, and map markers.
- Pagination adapter for backend list responses.
- Navigation badge aggregate from `GET /me/navigation-badges`.
- Notifications list, unread count, read actions, read all, create, and delete helpers.
- Chat REST mutation calls for messages, invites, DM, manual groups, member actions, rename, read state, and reconcile.
- Chat conversation, invite, and message reads are remote-first in normal API mode.
- Management requests, decisions, teams, and quotas.
- Command center settings REST wrappers.
- Extraction job start, list, poll, download URL, and clear wrappers.
- File upload helper through centralized multipart API support, wired into chat attachments and author dashboard upload fields.
- Integration cleanup utility removes local demo state before QA without clearing API tokens or theme preference.

## Configuration

Add this environment variable for API mode:

```txt
VITE_API_BASE_URL=https://backend.dev.morneven.com/api
```

The default fallback is the same dev backend URL if the variable is not set.

Demo fallback for unauthorized backend calls is only enabled in test mode or when explicitly set:

```txt
VITE_DEMO_FALLBACK=true
```

## Validation

Local validation:

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript | PASS | `tsc --noEmit` passed. |
| Lint | PASS with warnings | 0 errors, existing 13 warnings remain. |
| Tests | PASS | 3 files, 10 tests. |
| Build | PASS | Production build completed. |

Backend dev smoke:

| Endpoint | Result |
| --- | --- |
| `GET /health` | PASS, 200 |
| `GET /ready` | PASS, 200 |
| `POST /api/auth/login` | PASS, token returned |
| `GET /api/auth/me` | PASS, 200 |
| `GET /api/projects?page=1&pageSize=5` | PASS, 200 |
| `GET /api/lore/characters?page=1&pageSize=5` | PASS, 200 |
| `GET /api/gallery?page=1&pageSize=5` | PASS, 200 |
| `GET /api/chat/conversations` | PASS, 200 |
| `GET /api/me/navigation-badges` | PASS, 200 |
| `GET /api/notifications/unread-count` | PASS, 200 |
| `GET /api/management/requests/pending-count` | PASS, 200 |
| `GET /api/chat/conversations/conv-institute/messages?page=1&pageSize=5` | PASS, 200 |
| `GET /api/chat/invites` | PASS, 200 |
| `GET /api/settings/command-center` | PASS, 200 |
| `GET /api/settings/extractions` | PASS, 200 |
| `GET /api/map/markers` | PASS, 200 |
| `GET /api/map/image` | PASS, 200 |

## Phase Status

| Phase | Status | Notes |
| --- | --- | --- |
| 1 API foundation | Complete | Central client, token, refresh, upload, error handling. |
| 2 Auth | Complete | Backend login, register, guest, logout, refresh, and me. |
| 3 Read modules | Complete | Content, personnel, map, chat, settings, and extraction reads are remote-first. |
| 4 Write modules | Complete for REST baseline | Main content, map markers, gallery comments, personnel, and file upload call backend. |
| 5 Workflow modules | Complete for REST baseline | Notifications, badges, chat actions, management actions, extraction, and reconcile call backend. |
| 6 Demo fallback cleanup | Complete for production path | Fallback is limited to test or explicit demo flag. |
| 10 QA handover | Complete | FE QA handover checklist and cleanup path are documented. |

## Remaining Integration Notes

- WebSocket chat is not enabled yet. REST polling and refresh are the current baseline.
- Some author-panel controls keep local form state before save, but persistence calls are backend REST.
- File delete is still not available from backend.
- Manual chat group hard delete is still not available from backend.
- Extraction testing should remain limited because jobs can create archive files.
- Existing lint warnings are unchanged and non-blocking.
- Build still warns about stale Browserslist data and main chunk size.

## Recommended Next Step

Run browser QA against FE with `VITE_API_BASE_URL=https://backend.dev.morneven.com/api`, using seed account `author@morneven.com` with `SeedPassword123`.

Handover document:

```txt
docs/FE_QA_HANDOVER_REST_INTEGRATION_2026-05-03.md
```
