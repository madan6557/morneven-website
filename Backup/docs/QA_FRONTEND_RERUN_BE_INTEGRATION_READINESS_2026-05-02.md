# Morneven Frontend QA Rerun And BE Integration Readiness

Date: 2026-05-02
QA role: Frontend QA
Target repository: `morneven-website`
Fix report reviewed: `docs/QA_FRONTEND_FIX_REPORT_2026-05-02.md`
Source QA guide: `docs/QA_FRONTEND_TEST_GUIDE.md`
Local target: fresh production build served from `dist`
Public smoke target: `https://morneven.com`

## Executive Verdict

Frontend QA verdict: PASS.

BE integration readiness verdict: READY TO START INTEGRATION, with contract and adapter work still required.

Meaning:

- The frontend is stable enough to begin replacing demo localStorage services with backend REST adapters.
- The frontend is not already backend-integrated.
- Backend integration cannot be marked complete until the service files listed in `BE-REST-API-Requirement.md` are wired to backend endpoints and pass integration acceptance.

No P0, P1, or P2 frontend QA defects remain after the FE Dev fix pass.

## Fix Verification

| Previous Defect | Severity | Rerun Result | Evidence |
| --- | --- | --- | --- |
| DEF-001 invalid login email does not show inline validation | P2 | PASS | `AUTH-INVALID-LOGIN` passed; `src/pages/Auth.tsx` uses `noValidate` and renders React validation messages |
| DEF-002 social preview image missing | P3 | PASS locally | `public/opengraph-image.png` and `dist/opengraph-image.png` exist; metadata now points to `/android-chrome-512x512.png` |

Deployment note:

- `https://morneven.com/android-chrome-512x512.png` returns `200`.
- `https://morneven.com/opengraph-image.png` still returns `404`, which means the compatibility asset has not reached public deploy yet. This is not blocking BE integration because current metadata no longer depends on that old path.

## Command Results

| Check | Result | Notes |
| --- | --- | --- |
| `node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit` | PASS | No TypeScript errors |
| `npm.cmd run lint` | PASS with warnings | 0 errors, 13 existing warnings |
| `npm.cmd run test` | PASS | 3 test files, 10 tests passed |
| `npm.cmd run build` | PASS | Production build completed |

Remaining non-blocking warnings:

- Existing fast-refresh export warnings.
- Existing hook dependency warnings in `AuthorDashboard.tsx`, `ChatPage.tsx`, and `ManagementPage.tsx`.
- Browserslist data is stale.
- Main JS chunk remains larger than 650 kB after minification.

## Browser QA Rerun

Automated local production browser QA:

| Metric | Result |
| --- | --- |
| Total checks | 77 |
| Passed checks | 77 |
| Failed checks | 0 |
| Screenshots captured | 20 |
| Browser | HeadlessChrome 147 |
| Viewports | `390x844`, `768x1024`, `1366x768`, `1920x1080` |

Public route smoke:

| Route | Result |
| --- | --- |
| `/` | PASS |
| `/auth` | PASS |
| `/projects/proj-001` | PASS |
| `/gallery/gal-001` | PASS |
| `/lore/characters/char-001` | PASS |
| `/maps` | PASS |

Public smoke console errors: none.

## Key QA Areas

| Area | Result |
| --- | --- |
| Auth validation | PASS |
| Register validation | PASS |
| Route smoke for fixed seed targets | PASS |
| Guest route restrictions | PASS |
| PL1 author route restriction | PASS |
| Author access to Author Dashboard | PASS |
| Author access to Personnel | PASS |
| Projects search UI | PASS |
| Unknown detail ID handling | PASS |
| Blank project create validation | PASS |
| Gallery comment creation | PASS |
| Responsive horizontal overflow | PASS |

## BE Integration Readiness Assessment

The FE is ready to enter backend integration because:

- Build, typecheck, lint, and tests are passing.
- The UI smoke and permission gates are stable.
- Route and seed detail surfaces are repeatable.
- Validation issues from the previous QA report are fixed.
- No frontend blocker remains that would prevent REST adapter work.

The FE is not yet backend-wired because current services still use demo/localStorage-backed state. The backend requirement document explicitly states:

- Current FE still stores active data in localStorage and seed JSON.
- Current FE does not yet call REST endpoints for reviewed feature flows.
- Current service files must be replaced by REST-backed adapters.

Main integration work still required:

| Area | Required Work |
| --- | --- |
| Auth | Replace demo login/register with backend auth, JWT/session handling, refresh behavior, logout |
| Personnel | Replace local personnel store with API-backed user, role, PL, and track data |
| Projects/Gallery/Lore/News/Map | Replace seed/localStorage CRUD with REST list/detail/mutation endpoints |
| Chat | Wire conversations, messages, replies, attachments, invites, unread state, system groups, realtime updates |
| Management | Wire requests, review queue, quotas, teams, approvals, side effects, notifications |
| Notifications | Replace local notification inbox with backend notification endpoints and badge aggregation |
| Settings extraction | Replace frontend-generated extraction with backend job start, polling, history, and artifact download |
| Error handling | Map backend `success`, `message`, `data`, `errorCode`, and `errors` envelope to UI states |

## Integration Acceptance Gates

Before calling the BE integration complete, these must pass:

- FE login and register against backend.
- FE can browse all major modules without response-shape runtime errors.
- All guarded routes use backend authority, not localStorage authority.
- Backend list endpoints support pagination for high-volume Gallery, Lore, Projects, and admin lists.
- Mutations return the same entity shape expected by FE state updates.
- `422` validation errors render in UI and do not crash pages.
- `401` and expired-token flows return user to auth safely.
- Chat realtime or polling updates conversation state and sidebar badge counts.
- Management approvals trigger expected side effects and notifications.
- Cross-browser state is shared through backend, not localStorage.

## Final QA Verdict

Frontend status: PASS.

Ready for BE integration: YES.

Ready for production after BE integration: NO, not until REST adapters are implemented and the full FE plus BE integration acceptance suite passes.
