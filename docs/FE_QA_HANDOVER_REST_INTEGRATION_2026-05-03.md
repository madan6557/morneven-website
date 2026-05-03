# Morneven FE QA Handover For REST Integration

Date: 2026-05-03
Frontend target: `morneven-website`
Backend target: `https://backend.dev.morneven.com/api`
Status: Ready for FE QA regression

## Summary

The frontend REST integration baseline is complete and ready for FE QA regression. Normal application mode uses backend REST as the source of truth. Demo fallback is restricted to test mode or explicit `VITE_DEMO_FALLBACK=true`.

Use this handover together with:

- `docs/FE_REST_API_INTEGRATION_REPORT_2026-05-03.md`
- `docs/QA_FRONTEND_TEST_GUIDE.md`
- Backend `QA_RAILWAY_TEST_GUIDE.md`
- Backend `FE_INTEGRATION_NOTES.md`

## Environment

Create or verify local environment:

```txt
VITE_API_BASE_URL=https://backend.dev.morneven.com/api
```

Do not set this variable during QA unless a demo fallback run is explicitly requested:

```txt
VITE_DEMO_FALLBACK=true
```

Seed account:

```txt
Email: author@morneven.com
Password: SeedPassword123
Role: author
Level: 7
Track: executive
```

Secondary account examples:

```txt
Email: y.tanaka@morneven.com
Password: SeedPassword123
Role: personel
Level: 1
Track: executive
```

```txt
Email: guest@morneven.com
Password: SeedPassword123
Role: guest
Level: 0
Track: executive
```

## Pre-QA State Reset

Before full QA, login as PL7 and open:

```txt
/settings
```

Run:

```txt
Integration State Cleanup -> Clear Demo State
```

This removes local demo keys such as local content, local chat, local management, local notification, local command center settings, and local extraction history. It does not remove API auth tokens or theme preference.

Browser-level cleanup is still acceptable if QA wants a fully clean profile.

## Validation Already Completed

Local validation:

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Lint | PASS with 13 existing warnings |
| Tests | PASS, 3 files and 10 tests |
| Production build | PASS |

Backend dev smoke completed:

| Endpoint | Result |
| --- | --- |
| `GET /health` | PASS |
| `GET /ready` | PASS |
| `POST /api/auth/login` | PASS |
| `GET /api/auth/me` | PASS |
| `GET /api/projects?page=1&pageSize=5` | PASS |
| `GET /api/lore/characters?page=1&pageSize=5` | PASS |
| `GET /api/gallery?page=1&pageSize=5` | PASS |
| `GET /api/chat/conversations` | PASS |
| `GET /api/chat/conversations/conv-institute/messages?page=1&pageSize=5` | PASS |
| `GET /api/chat/invites` | PASS |
| `GET /api/me/navigation-badges` | PASS |
| `GET /api/notifications/unread-count` | PASS |
| `GET /api/management/requests/pending-count` | PASS |
| `GET /api/settings/command-center` | PASS |
| `GET /api/settings/extractions` | PASS |
| `GET /api/map/markers` | PASS |
| `GET /api/map/image` | PASS |

## FE QA Checklist

Auth and session:

- Login with PL7 seed account.
- Login with PL1 account.
- Login with guest account if applicable.
- Invalid login shows error without crashing.
- Register validates password minimum 12 characters.
- Refresh page keeps backend session.
- Logout clears access and returns user to public flow.

Permission and route guard:

- Guest cannot access Chat or Management UI.
- PL1 cannot enter Author Panel.
- PL7 can access Author Panel, Personnel, Settings, Management, Chat.
- Direct URL access respects route permissions.

Content REST:

- Projects list and detail load from backend.
- Gallery list and detail load from backend.
- Lore category and detail routes load from backend.
- News detail loads from backend.
- Map markers and map image load from backend.
- Search, filters, pagination, empty state, and not-found state remain usable.

Author Panel:

- Create, update, and delete a QA-prefixed project.
- Create or update QA-prefixed gallery item.
- Upload thumbnail or document file and verify returned URL persists.
- Update map marker and verify map page reflects backend data.
- Command Center settings save and survive reload.

Chat:

- Conversations load from backend.
- Institute messages load from backend.
- Send QA-prefixed message.
- Mark read updates sidebar indicator.
- Create DM if allowed.
- Create manual group if allowed.
- Invite, accept, reject, kick, leave, role change, and rename should call backend.
- System-managed groups should reject unsupported manual management.

Management:

- Requests list loads from backend.
- Pending count appears in sidebar for authorized user.
- Create QA-prefixed request if workflow allows.
- Decide QA request as authorized reviewer.
- Verify side effects expected by backend workflow, such as notification, personnel change, team update, chat sync, project, or gallery item.

Notifications:

- Notification list loads from backend.
- Unread count loads from backend.
- Mark single read.
- Mark all read.
- Delete notification if available for the user.

Settings and extraction:

- System Chat Reconciliation calls backend.
- Command center settings load and save.
- Extraction list loads from backend.
- Start extraction only if QA owner approves storage usage.
- Poll extraction until terminal state if extraction is started.
- Download completed extraction result if available.
- Clear selected extraction jobs if backend allows it.

Responsive and visual:

- Check `390x844`, `768x1024`, `1366x768`, and `1920x1080`.
- No horizontal overflow.
- No overlapping content in auth, home, projects, gallery, lore, map, chat, management, settings, and author panel.
- No uncaught console errors.

## Known Non-Blocking Items

- WebSocket chat is not enabled yet. REST refresh is the current baseline.
- Backend has no confirmed uploaded file delete endpoint.
- Backend has no manual chat group hard-delete endpoint.
- Build still warns about stale Browserslist data.
- Build still warns about main chunk size.
- Lint has 13 existing warnings, no errors.

## QA Verdict Recommendation

If the checklist passes, FE can be marked ready for backend integration acceptance on REST baseline.

If defects appear, classify them by integration surface:

- Auth/session
- Permission/RBAC
- Response shape mismatch
- Data persistence
- Upload/media
- Chat workflow
- Management workflow
- Settings/extraction
- Responsive/UI regression
