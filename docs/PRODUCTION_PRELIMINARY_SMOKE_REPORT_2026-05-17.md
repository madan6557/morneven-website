# Morneven Production Preliminary Smoke Report - 2026-05-17

Document version: `2026-05-17-production-prelim-smoke`
Date: 2026-05-17
Timezone: Asia/Singapore
Status: preliminary production smoke passed with authenticated-admin scope pending

## Scope

This smoke test was non-destructive and used public runtime endpoints plus canonical guest mode. It did not use author/admin credentials and did not mutate production data.

## Target

| Surface | URL |
| --- | --- |
| Frontend | `https://morneven.com` |
| Backend | `https://morneven-backend-production.up.railway.app` |
| API base | `https://morneven-backend-production.up.railway.app/api` |

## Version Evidence

| Component | Commit | Env |
| --- | --- | --- |
| Frontend | `b4272c031d87920a6fd616fabfbbced19c0df7e4` | `production` |
| Backend | `fd3957c864c8cdffa1e4e547a28acafb2e732c92` | `production` |
| Backend API version | `fd3957c864c8cdffa1e4e547a28acafb2e732c92` | `production` |

## Smoke Results

| Area | Check | Result |
| --- | --- | --- |
| FE runtime | `GET /health` | PASS |
| FE runtime | `GET /ready` | PASS |
| FE runtime | `GET /version` | PASS |
| FE routes | `GET /` | PASS |
| FE routes | `GET /chat` | PASS |
| FE routes | `GET /settings` | PASS |
| FE routes | `GET /security` | PASS |
| BE runtime | `GET /health` | PASS |
| BE runtime | `GET /ready` | PASS |
| BE runtime | `GET /version` | PASS |
| BE runtime | `GET /api/health` | PASS |
| BE runtime | `GET /api/ready` | PASS |
| BE runtime | `GET /api/version` | PASS |
| CORS | `OPTIONS /api/auth/login` from `https://morneven.com` | PASS |
| Auth | `POST /api/auth/guest` | PASS |
| Guest reads | `GET /api/projects?page=1&pageSize=3` | PASS |
| Guest reads | `GET /api/gallery?page=1&pageSize=3` | PASS |
| Guest reads | `GET /api/lore/characters?page=1&pageSize=3` | PASS |
| Guest reads | `GET /api/news?page=1&pageSize=3` | PASS |
| Guest reads | `GET /api/content-stats` | PASS |

## Pending Authenticated Smoke

These checks still require a production author/admin credential or an owner-run session:

| Area | Required check |
| --- | --- |
| Authenticated auth | author/admin login, `/api/auth/me`, logout |
| Protected reads | `/api/chat/conversations`, `/api/me/navigation-badges`, `/api/security/status` |
| Realtime | WebSocket opens with valid non-guest token |
| Realtime security | WebSocket closes after `/api/security/sessions/:id/revoke` |
| File proxy | Protected production object reads through `/api/files/object` |

## Conclusion

Preliminary production smoke passed for runtime, routes, CORS, guest auth, and guest-readable core data. Full production smoke is not complete until authenticated author/admin and WebSocket revoke checks are run.
