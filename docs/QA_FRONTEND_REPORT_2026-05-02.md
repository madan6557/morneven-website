# Morneven Frontend QA Report

Date: 2026-05-02
Tester role: QA Frontend
Target repository: `morneven-website`
Primary target: local `dist` served as SPA on `http://127.0.0.1:3000`
Guide used: `docs/QA_FRONTEND_TEST_GUIDE.md`

## Executive Verdict

Final verdict: FAIL for release readiness.

Reason:

- One P1 permission defect was found: Guest users can access Chat through the direct `/chat` route.
- Several P2 functional defects were found in route fallback behavior and CRUD validation.
- Full browser visual QA could not be completed in this environment because all available browser automation paths were blocked.
- `npm run test` and `npm run build` could not complete because `esbuild` service spawn was blocked by the local environment.

This run is still useful as a source-backed and route-backed QA pass, but it is not a complete visual acceptance run.

## Environment

| Item | Result |
| --- | --- |
| OS shell | PowerShell |
| Node from system | v22.12.0 |
| Bundled Node | v24.14.0 |
| Local app serving | Static SPA server against `dist` |
| Browser automation | Blocked |
| Public deploy QA | Not executed |
| Worktree status before report | `docs/QA_FRONTEND_TEST_GUIDE.md` untracked |

## Command Results

| Check | Result | Notes |
| --- | --- | --- |
| `npm.cmd run lint` | PASS with warnings | 0 errors, 13 warnings |
| `npm.cmd run test` | BLOCKED | Vitest config failed because `esbuild` spawn returned `EPERM` |
| `npm.cmd run build` | BLOCKED | Vite config failed because `esbuild` spawn returned `EPERM` |
| Static SPA route fallback | PASS | Tested route list returned `200` and app root HTML |
| Fixed seed target existence | PASS | All Section 20 fixed IDs exist in seed JSON |

Lint warnings observed:

- Fast refresh export warnings in shared component files.
- Missing React hook dependency warnings in `AuthorDashboard.tsx`, `ChatPage.tsx`, and `ManagementPage.tsx`.

## Browser QA Blockers

| ID | Area | Result |
| --- | --- | --- |
| BQ-01 | Browser-use Node REPL | BLOCKED: Node REPL resolved system Node v22.12.0, but browser-use requires at least v22.22.0 |
| BQ-02 | Playwright bundled browser | BLOCKED: Chromium executable was not installed in Playwright cache |
| BQ-03 | Playwright with system Chrome | BLOCKED: Chrome spawn returned `EPERM` |
| BQ-04 | Chrome remote debugging fallback | BLOCKED by shell policy |

Impact:

- Visual regression screenshots were not captured.
- Click-through UI flow QA was not completed.
- Responsive layout could not be verified in an actual browser viewport.

## Route Fallback Smoke

The following local routes returned `200`, served `index.html`, and contained the React root:

- `/`
- `/auth`
- `/home`
- `/projects`
- `/projects/proj-001`
- `/gallery`
- `/gallery/gal-001`
- `/lore`
- `/lore/characters/char-001`
- `/lore/places/place-001`
- `/lore/tech/tech-001`
- `/lore/creatures/crea-001`
- `/lore/events/evt-001`
- `/lore/other/other-001`
- `/lore/personnel`
- `/maps`
- `/author`
- `/personnel`
- `/settings`
- `/news/news-007`
- `/management`
- `/chat`
- `/unknown-route-qa`

Note: this validates SPA fallback only, not React-rendered page content.

## Seed Data Validation

All fixed smoke IDs from Section 20 exist:

- Projects: `proj-001`, `proj-002`
- Gallery: `gal-001`, `gal-002`
- Lore: `char-001`, `place-001`, `tech-001`, `crea-001`, `evt-001`, `other-001`, `other-005`
- News: `news-007`, `news-008`
- Personnel: `psn-001`, `psn-003`

## Defects

### DEF-001: Guest can access Chat through direct route

Severity: P1 Critical

Status: Open

Evidence:

- `src/components/AppSidebar.tsx` hides Chat when `role === "guest"`.
- `src/pages/ChatPage.tsx` only checks `isAuthenticated`.
- `guestLogin()` sets `isAuthenticated` to true and `role` to guest.

Expected:

- Guest users should not access Chat from sidebar or direct route.

Actual:

- Direct `/chat` route is not role-blocked for Guest once Guest Mode has authenticated the session.

Impact:

- UI permission expectation is bypassed by direct URL navigation.

Suggested fix:

- Update `ChatPage` or route guard to also block `role === "guest"`, matching `ManagementPage` behavior.

### DEF-002: Unknown detail IDs stay in loading state instead of controlled not-found

Severity: P2 Major

Status: Open

Evidence:

- `src/pages/ProjectDetail.tsx` renders `Loading project...` whenever `project` is null.
- `src/pages/GalleryDetail.tsx` renders `Loading...` whenever `item` is null.
- `src/pages/CharacterDetail.tsx`, `PlaceDetail.tsx`, `TechDetail.tsx`, `CreatureDetail.tsx`, `EventDetail.tsx`, and `OtherDetail.tsx` use the same null-as-loading pattern.
- `src/pages/NewsDetail.tsx` already has a separate `loading` state and controlled not-found behavior.

Expected:

- Unknown IDs should show a controlled not-found state after fetch resolves.

Actual:

- Missing detail records are indistinguishable from loading and can leave users on an indefinite loading message.

Impact:

- Negative route tests in the guide fail for project, gallery, and lore detail pages.

Suggested fix:

- Add `loading` state to every affected detail page and render a not-found message after fetch resolves with no record.

### DEF-003: Projects page has no search UI despite QA requirements and API support

Severity: P2 Major

Status: Open

Evidence:

- QA guide requires project text search.
- `src/services/projectsApi.ts` supports `search` in `getProjectsPage`.
- `src/pages/ProjectsPage.tsx` only exposes status tabs and pagination. It does not expose a search input or pass `search` to `getProjectsPage`.

Expected:

- Projects list should support project text search and an empty state.

Actual:

- Users cannot search project text from `/projects`.

Impact:

- Feature checklist cannot pass for Projects.

Suggested fix:

- Add a search input to `ProjectsPage`, pass the query to `getProjectsPage`, and reset pagination when the query changes.

### DEF-004: Author Dashboard create and edit paths allow blank required content

Severity: P2 Major

Status: Open

Evidence:

- `src/pages/AuthorDashboard.tsx` builds create payloads with fallback empty strings for required fields.
- `handleSave` does not validate project title, descriptions, gallery title/caption, or lore title/name before calling create/update APIs.

Expected:

- Required fields should block save and show clear validation feedback.

Actual:

- Source path allows saving records with blank required content.

Impact:

- QA-created or user-created data can become unusable in public lists and detail pages.

Suggested fix:

- Add per-surface validation before save. Block empty title/name and required descriptions/captions with visible inline errors or a destructive toast.

### DEF-005: Social preview image is referenced but missing from public assets

Severity: P3 Minor

Status: Open

Evidence:

- `index.html` and `dist/index.html` reference `/opengraph-image.png`.
- `public/opengraph-image.png` and `dist/opengraph-image.png` do not exist.

Expected:

- Referenced Open Graph and Twitter image asset should exist.

Actual:

- Social preview image request will 404.

Impact:

- Social sharing previews can be broken.

Suggested fix:

- Add `public/opengraph-image.png` or update meta tags to an existing asset.

### DEF-006: Not-found route logs a console error for expected 404 navigation

Severity: P3 Minor

Status: Open

Evidence:

- `src/pages/NotFound.tsx` calls `console.error` when an unknown route is opened.

Expected:

- Expected not-found navigation should render a controlled page without polluting console errors.

Actual:

- QA console check may register an error for the intentional unknown-route test.

Impact:

- Console QA becomes noisy and can mask actual runtime errors.

Suggested fix:

- Use `console.warn` in development only, or remove the log from production.

### DEF-007: Lint warnings remain

Severity: P3 Minor

Status: Open

Evidence:

- `npm.cmd run lint` reports 13 warnings.
- Hook dependency warnings are present in `AuthorDashboard.tsx`, `ChatPage.tsx`, and `ManagementPage.tsx`.

Expected:

- Lint should complete cleanly for a release candidate.

Actual:

- Lint exits successfully but reports warnings.

Impact:

- Hook dependency warnings can hide stale state or missed refresh edge cases.

Suggested fix:

- Address hook dependency warnings or document intentionally stable callbacks.
- Move non-component exports out of component files where fast refresh warnings appear.

## Passed Or Partially Passed Areas

| Area | Result |
| --- | --- |
| QA guide completeness | PASS |
| Seed target existence | PASS |
| Local SPA fallback | PASS |
| Vercel rewrite config present | PASS |
| Auth validation source messages | PASS |
| Sidebar guest filtering source | PASS |
| Management guest direct access block | PASS |
| News detail unknown ID handling | PASS |
| Gallery and lore search source | PASS |
| Lazy loading markers in image cards | PARTIAL PASS by source |

## Not Executed

The following remain unverified because browser automation was blocked:

- Actual desktop and mobile visual layout.
- Text overlap and horizontal overflow checks.
- Interactive auth form behavior in browser.
- Sidebar open, close, and mobile navigation behavior.
- CRUD click-through and persistence through UI.
- Chat send, reply, invite, attachment flows.
- Management request submission and approval through UI.
- Notification bell UI behavior.
- Theme persistence through actual reload.
- Console and network checks from a real browser page runtime.
- Public deploy smoke on `https://morneven.com`.

## QA Verdict Template

Target: local `dist` served through temporary SPA server
Browser: not executed, browser automation blocked
Viewport: not executed
Build or commit: current working tree, `docs/QA_FRONTEND_TEST_GUIDE.md` untracked before this report
Account: source-based checks for author, guest, PL1, PL5, PL6, PL7
Scope: lint, build/test attempt, SPA route fallback, seed validation, source-backed functional and permission QA

Smoke result: PARTIAL PASS, route fallback passes but React render smoke not executed
Auth result: PARTIAL PASS by source, browser interaction not executed
Navigation result: PARTIAL PASS, SPA fallback passes, unknown detail IDs have defects
Content browsing result: PARTIAL PASS, fixed seed targets exist, visual render not executed
CRUD result: FAIL, missing required validation in Author Dashboard source
Workflow result: PARTIAL, Management guest block exists, Chat guest direct route defect found
Responsive result: BLOCKED, browser automation unavailable
Known limitations accepted: demo auth, localStorage authority, no backend sync, non-durable file previews
Blocking defects: DEF-001
Non-blocking defects: DEF-002, DEF-003, DEF-004, DEF-005, DEF-006, DEF-007
Cleanup completed: temporary localStorage UI data was not created
Final verdict: FAIL for release readiness, BLOCKED for complete visual acceptance
