# Morneven Frontend QA Report

Date: 2026-05-02
Tester role: QA Frontend
Target repository: `morneven-website`
Guide used: `docs/QA_FRONTEND_TEST_GUIDE.md`
Local target: production `dist` served on `http://127.0.0.1:4173`
Public target: `https://morneven.com`

## Executive Verdict

Final verdict: Conditional PASS for demo frontend readiness.

There are no P0 or P1 blockers in this run. Core route smoke, auth access, permission guards, seed detail routes, responsive overflow checks, and deployed public smoke passed. One P2 functional UX issue remains in login validation, and one P3 asset issue remains for the social preview image.

This report supersedes the earlier blocked QA report from the same date.

## Environment

| Item | Result |
| --- | --- |
| OS shell | PowerShell |
| Browser | HeadlessChrome 147 via system Chrome |
| Local mode | Production build served from `dist` |
| Public mode | Read-only smoke on `https://morneven.com` |
| Viewports | `390x844`, `768x1024`, `1366x768`, `1920x1080` |
| Browser profile | Isolated incognito contexts |
| Screenshots | `docs/qa-screenshots-2026-05-02/` |

## Command Results

| Check | Result | Notes |
| --- | --- | --- |
| `npm.cmd run lint` | PASS with warnings | 0 errors, 13 warnings |
| `npm.cmd run test` | PASS | 3 files passed, 10 tests passed |
| `npm.cmd run build` | PASS | Build completed |

Build warnings:

- Browserslist data is stale.
- Main JS chunk is larger than 650 kB after minification.

Lint warnings:

- Fast refresh export warnings in UI and shared component files.
- Hook dependency warnings in `AuthorDashboard.tsx`, `ChatPage.tsx`, and `ManagementPage.tsx`.

## Automated Browser QA Summary

| Area | Result |
| --- | --- |
| Local browser checks | 77 total, 75 pass, 2 fail |
| Public smoke checks | 6 total, 6 pass |
| Screenshots captured | 20 |
| Horizontal overflow checks | 40 pass, 0 fail |
| Seed route smoke | 15 pass, 0 fail |
| Permission checks | 7 pass, 0 fail |
| Not-found handling checks | 8 pass, 0 fail |

Screenshots captured:

- Desktop: auth, author, chat, gallery, home, landing, lore, management, projects, settings.
- Mobile: auth, author, chat, gallery, home, landing, lore, management, projects, settings.

## Local Route Smoke

Passed routes:

- `/`
- `/auth`
- `/projects/proj-001`
- `/projects/proj-002`
- `/gallery/gal-001`
- `/gallery/gal-002`
- `/lore/characters/char-001`
- `/lore/places/place-001`
- `/lore/tech/tech-001`
- `/lore/creatures/crea-001`
- `/lore/events/evt-001`
- `/lore/other/other-001`
- `/lore/personnel`
- `/news/news-007`
- `/maps`

Each route loaded and contained the expected seed display text.

## Public Smoke

Read-only deployed smoke passed on `https://morneven.com`:

| Route | HTTP | Result |
| --- | --- | --- |
| `/` | 200 | PASS |
| `/auth` | 200 | PASS |
| `/projects/proj-001` | 200 | PASS |
| `/gallery/gal-001` | 200 | PASS |
| `/lore/characters/char-001` | 200 | PASS |
| `/maps` | 200 | PASS |

No browser console errors were captured during public smoke.

## Permission Results

| Scenario | Result |
| --- | --- |
| Logged out user opens `/author` | PASS, redirected to `/auth` |
| Guest Mode sidebar visibility | PASS, Chat and Management hidden |
| Guest opens `/management` directly | PASS, blocked |
| Guest opens `/chat` directly | PASS, blocked or not given chat conversation UI |
| PL1 user opens `/author` | PASS, redirected to `/home` |
| Author opens `/author` | PASS |
| Author opens `/personnel` | PASS |

## Functional Results

| Scenario | Result |
| --- | --- |
| Login invalid short password | PARTIAL, see DEF-001 |
| Register invalid username and password | PASS |
| Projects search UI | PASS |
| Unknown project, gallery, and lore detail IDs | PASS |
| Author Dashboard blank project save | PASS, validation blocks save |
| Gallery comment creation as author | PASS |
| Unknown route page | PASS |

## Visual And Responsive Results

All tested pages passed horizontal overflow checks at `390x844`, `768x1024`, `1366x768`, and `1920x1080`.

Visual screenshot review did not show obvious critical overlap in sampled P0 surfaces. Mobile screenshots show the app shell, auth, dashboard, author panel, chat, management, and settings remain usable within the viewport.

## Defects

### DEF-001: Invalid login email does not show expected inline validation

Severity: P2 Major

Status: Open

Evidence:

- Automated check `AUTH-INVALID-LOGIN` failed.
- `src/pages/Auth.tsx` has custom inline message `Valid email required`.
- The email field uses `type="email"`.
- In Chrome, entering `not-an-email` causes native browser validation to block form submission before React `handleSubmit` runs.

Expected:

- Invalid login should show the guide-specified inline errors: `Valid email required` and `Min 6 characters`.

Actual:

- Browser native validation intercepts the invalid email case, so the inline email error is not rendered.

Impact:

- QA guide expectation is not met.
- Error UX is inconsistent between email format errors and password length errors.

Suggested fix:

- Add `noValidate` to the form and rely on the existing React validation, or replace `type="email"` with `type="text"` plus explicit validation.

### DEF-002: Referenced social preview image is missing

Severity: P3 Minor

Status: Open

Evidence:

- `index.html` references `/opengraph-image.png` for Open Graph and Twitter metadata.
- `public/opengraph-image.png` is missing.
- `dist/opengraph-image.png` is missing.
- `https://morneven.com/opengraph-image.png` returns 404.

Expected:

- Referenced social preview image should exist and return an image response.

Actual:

- The referenced asset is missing.

Impact:

- Link previews can show missing or degraded social image metadata.

Suggested fix:

- Add `public/opengraph-image.png`, or update the metadata to reference an existing image asset.

## Non-Blocking Observations

### OBS-001: Local static production server logs analytics script errors

Local production serving outside Vercel produced repeated `Unexpected token '<'` console errors. Public smoke on `https://morneven.com` had zero console errors, so this was not counted as a deployed app defect.

Likely cause:

- Vercel analytics or speed insights scripts are available on Vercel but not on the ad hoc local static server.

### OBS-002: Bundle size warning remains

The production build emits a large chunk warning for the main JS bundle. This is already known as a demo limitation in the QA guide.

### OBS-003: Lint warnings remain

Lint has no errors, but 13 warnings remain. Most are fast-refresh export warnings plus hook dependency warnings.

## Not Fully Executed

The following were not exhaustively exercised in this run:

- Full manual multi-user Chat invite accept or reject flow.
- Full Management approval side-effect flow.
- Actual extraction download execution.
- Firefox, Edge, and Safari browser matrix.

Reason:

- The run prioritized local production Chrome automation, public smoke, route coverage, permission gates, responsive checks, and high-risk workflow probes.

## QA Verdict Template

Target: local production build and public deploy smoke
Browser: HeadlessChrome 147
Viewport: `390x844`, `768x1024`, `1366x768`, `1920x1080`
Build or commit: current working tree
Account: `author@morneven.com`, `y.tanaka@morneven.com`, Guest Mode
Scope: smoke, auth validation, permission, routes, responsive, selected CRUD, public smoke

Smoke result: PASS
Auth result: PARTIAL, DEF-001
Navigation result: PASS
Content browsing result: PASS
CRUD result: PASS for sampled gallery comment and blank project validation
Workflow result: PARTIAL, deep Chat and Management cross-flows not exhaustive
Responsive result: PASS for sampled pages and viewports
Known limitations accepted: demo auth, localStorage authority, no backend sync, non-durable file previews, large bundle warning
Blocking defects: none
Non-blocking defects: DEF-001, DEF-002
Cleanup completed: no persistent browser profile data created
Final verdict: Conditional PASS
