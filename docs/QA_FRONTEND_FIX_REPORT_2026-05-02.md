# Morneven Frontend QA Fix Report

Date: 2026-05-02
Source QA report: `docs/QA_FRONTEND_REPORT_2026-05-02.md`
Scope: Frontend-only fixes that can be completed without backend services or browser automation.

## Executive Summary

Most actionable frontend defects from the QA report were fixed in source:

| Defect | Status after fix | Notes |
| --- | --- | --- |
| DEF-001 Guest direct Chat access | Fixed | `ChatPage` now blocks `role === "guest"`. |
| DEF-002 Unknown detail IDs stay loading | Fixed | Project, Gallery, and Lore detail pages now separate loading from not-found state. |
| DEF-003 Projects has no search UI | Fixed | Projects page now has search input backed by `getProjectsPage({ search })`. |
| DEF-004 Author Dashboard allows blank required content | Fixed | Save is blocked with destructive toast feedback for required blank fields. |
| DEF-005 Missing social preview image | Fixed | Open Graph and Twitter image now point to existing `/android-chrome-512x512.png`. |
| DEF-006 NotFound logs console error | Fixed | Removed expected 404 `console.error`. |
| DEF-007 Lint warnings remain | Partially fixed | No new lint errors. Existing non-blocking warnings remain in shared component exports and older hook patterns. |

## Fixed Details

### DEF-001 Guest Chat Guard

Changed `src/pages/ChatPage.tsx`.

Behavior now matches sidebar and Management page policy:

- Authenticated guest users can no longer use direct `/chat`.
- Guest sees a controlled access message instead of chat content.

### DEF-002 Controlled Not Found For Detail Routes

Changed:

- `src/pages/ProjectDetail.tsx`
- `src/pages/GalleryDetail.tsx`
- `src/pages/CharacterDetail.tsx`
- `src/pages/PlaceDetail.tsx`
- `src/pages/TechDetail.tsx`
- `src/pages/CreatureDetail.tsx`
- `src/pages/EventDetail.tsx`
- `src/pages/OtherDetail.tsx`

Each page now:

- Starts with explicit `loading` state.
- Sets loading false after fetch resolves.
- Renders a controlled not-found message when the record is missing.
- Keeps the existing loading message only while fetch is pending.

### DEF-003 Projects Search

Changed `src/pages/ProjectsPage.tsx`.

Added:

- Search input.
- Deferred search value.
- Query passed into `getProjectsPage`.
- Empty state for no search results.
- Pagination reset when status tab or search query changes.

### DEF-004 Author Dashboard Required Field Validation

Changed `src/pages/AuthorDashboard.tsx`.

Save is now blocked for required blank fields:

- Projects: title, short description, full description.
- Gallery: title, caption.
- Lore entries: name or title, short description, full description.

User feedback uses a destructive toast with the missing field name.

### DEF-005 Social Preview Image

Changed `index.html`.

Updated:

- `og:image`
- `twitter:image`

Both now reference an existing public asset:

```txt
/android-chrome-512x512.png
```

### DEF-006 Expected Not Found Logging

Changed `src/pages/NotFound.tsx`.

Removed console logging for expected 404 navigation. This prevents intentional unknown route smoke tests from polluting console QA.

## Validation

Commands run:

```txt
node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Results:

- TypeScript: PASS.
- ESLint: PASS with warnings.
- Build: BLOCKED by `spawn EPERM` while Vite starts esbuild.
- Test: BLOCKED by `spawn EPERM` while Vitest starts esbuild.

Remaining warnings are the same non-blocking warning classes already called out by QA:

- Fast refresh warnings in shared component files.
- Hook dependency warnings in existing component effects.

## Blocked Validation

The same environment limitation still applies and was reproduced:

- `npm.cmd run build` and `npm.cmd test` are expected to remain blocked in this environment if Vite/Vitest attempts to spawn esbuild and receives `EPERM`.
- Browser visual QA remains unverified until browser automation or a manual browser pass is available.

## Residual Risk

DEF-007 remains partially open. Cleaning all warnings requires a broader refactor:

- Move shared non-component exports from component files into utility modules.
- Stabilize or refactor existing hook callbacks in `AuthorDashboard`, `ChatPage`, and `ManagementPage`.

No backend-dependent defects were addressed in this pass.
