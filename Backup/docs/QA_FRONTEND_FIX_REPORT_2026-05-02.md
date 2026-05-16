# Morneven Frontend QA Fix Report

Date: 2026-05-02
Source QA report: `docs/QA_FRONTEND_REPORT_2026-05-02.md`
Scope: Frontend fixes for the latest Conditional PASS QA report.

## Executive Summary

The latest QA report had no P0 or P1 blockers. Two open defects were reviewed and fixed in the frontend:

| Defect | Severity | Status after fix | Resolution |
| --- | --- | --- | --- |
| DEF-001 Invalid login email does not show expected inline validation | P2 | Fixed | Login form now uses React validation instead of native browser validation interception. |
| DEF-002 Referenced social preview image is missing | P3 | Fixed | Metadata references an existing asset, and `/opengraph-image.png` now exists for compatibility. |

## Fix Details

### DEF-001 Login Inline Validation

Changed file:

- `src/pages/Auth.tsx`

Fix:

- Added `noValidate` to the auth form.
- This prevents Chrome native email validation from blocking `handleSubmit`.
- Existing React validation now consistently renders:
  - `Valid email required`
  - `Min 6 characters`

Expected result:

- Entering `not-an-email` with a short password now allows React validation to run and show the guide-specified inline messages.

### DEF-002 Social Preview Image

Changed file:

- `index.html`
- `public/opengraph-image.png`

Current metadata:

```txt
og:image = /android-chrome-512x512.png
twitter:image = /android-chrome-512x512.png
```

The referenced asset exists in `public/android-chrome-512x512.png`, so future builds include it in `dist`.

Compatibility asset added:

```txt
public/opengraph-image.png
```

This prevents `/opengraph-image.png` from returning 404 if old metadata, cached previews, or external clients still request the previous URL.

## Validation

Commands run:

```txt
node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Results:

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript | PASS | No type errors. |
| Lint | PASS with warnings | 0 errors, existing 13 warnings remain. |
| Tests | PASS | 3 files passed, 10 tests passed. |
| Build | PASS | Production build completed. |

Build warnings still present:

- Browserslist data is stale.
- Main JS chunk is larger than 650 kB after minification.

Lint warnings still present:

- Fast refresh export warnings in shared component files.
- Existing hook dependency warnings in `AuthorDashboard.tsx`, `ChatPage.tsx`, and `ManagementPage.tsx`.

## Residual Risk

No unresolved P0, P1, or P2 defects remain from the latest QA report after this fix pass.

Remaining items are non-blocking release-hardening work:

- Resolve lint warnings through component export cleanup and hook dependency refactors.
- Reduce main bundle size through manual chunks or deeper code splitting.
- Update Browserslist data.
- Run another browser QA pass after these fixes are deployed or served from a fresh production build.
