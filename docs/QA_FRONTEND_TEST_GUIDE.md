# Morneven Frontend QA Test Guide

Last updated: 2026-05-02

This guide is for QA testing of the Morneven frontend application. It covers local testing through localhost and deployed testing through `morneven.com`.

## 1. Scope And Current Status

| Item | Value |
| --- | --- |
| Repository | `morneven-website` |
| Framework | React, Vite, React Router, Tailwind CSS |
| Local URL | `http://localhost:3000` |
| Public URL | `https://morneven.com` |
| Local dev command | `npm run dev` |
| Production build command | `npm run build` |
| Test command | `npm run test` |
| Lint command | `npm run lint` |
| Current system status | Demo frontend, not production-authenticated |

Important QA note:

- The frontend is still a demo system.
- Authentication is localStorage-backed and not connected to a real backend auth endpoint.
- Login accepts any password that passes the frontend form validation.
- Current login form only requires password length of at least `6` characters.
- The entered password is stored locally as a demo password snapshot and is used by Settings extraction validation.
- Do not treat FE login behavior as a security test result for backend auth.

## 2. Target Environment Rules

| Environment | URL | QA Usage |
| --- | --- | --- |
| Localhost | `http://localhost:3000` | Full FE QA, mutation testing, localStorage cleanup, destructive UI workflow testing |
| Public deploy | `https://morneven.com` | Public smoke testing, route testing, responsive testing, demo workflow testing |

Recommended target:

- Use localhost for full QA because localStorage can be reset safely and browser devtools can inspect state.
- Use `morneven.com` for deployed smoke and visual regression checks.
- If QA mutates demo content on `morneven.com`, changes are local to that browser profile because the FE still uses browser localStorage.

## 3. Run Locally

From `morneven-website`:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Expected:

- Vite dev server starts on port `3000`.
- App loads the landing page at `/`.
- Direct route access such as `/home`, `/projects`, `/lore`, and `/chat` should render without server 404 on local dev.

## 4. Build And Static Preview

Recommended checks before deployed QA:

```bash
npm run lint
npm run test
npm run build
npm run preview
```

Expected:

- Lint should complete with no errors.
- Tests should pass.
- Build should complete.
- Large bundle warnings may appear and are currently a known demo limitation.

## 5. Demo Auth Rules

### Login

Route:

```text
/auth
```

Valid demo login example:

| Field | Value |
| --- | --- |
| Email | `author@morneven.com` |
| Password | `anything6` |

Validation rules:

| Field | Rule |
| --- | --- |
| Email | Must match basic email format |
| Password | Minimum `6` characters |

Expected:

- Login succeeds when email format is valid and password has at least 6 characters.
- If the email exists in seeded personnel data, the app uses that seeded username, role, PL level, and track.
- If the email is `author@morneven.com` or `admin@morneven.com`, the user becomes an author account.
- Unknown valid email becomes a demo `personel` user.
- No real backend password verification occurs.

Invalid examples:

| Input | Expected |
| --- | --- |
| Email `not-an-email` | Inline validation error |
| Password `12345` | Inline validation error |
| Empty email | Inline validation error |
| Empty password | Inline validation error |

### Register

Validation rules:

| Field | Rule |
| --- | --- |
| Email | Must match basic email format |
| Username | Minimum `3` characters |
| Password | Minimum `6` characters |

Expected:

- New registered users become demo `personel` users.
- New registered users start as PL1 executive.
- Registration is local only and does not create a backend account.

### Guest Mode

Expected:

- Guest Mode logs in as `Guest`.
- Guest receives guest role and PL0.
- Guest can browse public/demo content.
- Guest should not see Chat or Management in the sidebar.

## 6. Recommended Demo Accounts

Passwords are arbitrary in the frontend demo, as long as they are at least 6 characters.

| Account | Expected Role And Level | Main QA Use |
| --- | --- | --- |
| `author@morneven.com` | author, PL7 executive | Full author/admin UI, Personnel, Settings extraction |
| `admin@morneven.com` | author, PL7 executive | Alternate full author/admin UI |
| `v.kessler@morneven.com` | personel, PL6 executive | L6 executive author access |
| `m.varga@morneven.com` | personel, PL6 field | Field-limited author access |
| `s.okafor@morneven.com` | personel, PL6 mechanic | Mechanic-limited author access |
| `guest@morneven.com` | guest or seeded user depending data lookup | Guest restriction check if seeded behavior is present |
| Guest Mode | guest, PL0 | Guest restriction check |

If a specific seeded email behaves differently, capture the current seeded personnel record from the UI or `src/data/personnel.json`.

## 7. Routes To Test

| Route | Page | Auth Required | Expected |
| --- | --- | --- | --- |
| `/` | Landing | no | Public landing screen loads |
| `/auth` | Auth | no | Login, register, guest mode available |
| `/home` | Command Center | yes preferred | Dashboard sections render from seed and localStorage |
| `/projects` | Projects list | no hard guard | Project cards, status tabs, archived tab |
| `/projects/:id` | Project detail | no hard guard | Detail tabs for overview, patches, docs, metadata |
| `/gallery` | Gallery list | no hard guard | Gallery grid, search, sort, type filter |
| `/gallery/:id` | Gallery detail | no hard guard | Media detail, comments, replies |
| `/lore` | Lore index | no hard guard | Category tabs, search, sort |
| `/lore/:category` | Lore category | no hard guard | Category-specific cards |
| `/lore/characters/:id` | Character detail | no hard guard | Character metadata, docs, discussions |
| `/lore/places/:id` | Place detail | no hard guard | Place detail and optional interactive map |
| `/lore/tech/:id` | Technology detail | no hard guard | Tech detail, docs, discussions |
| `/lore/creatures/:id` | Creature detail | no hard guard | Creature detail, GEC tier, docs |
| `/lore/events/:id` | Event detail | no hard guard | Event detail, impact, docs |
| `/lore/other/:id` | Other lore detail | no hard guard | Other lore detail |
| `/lore/personnel` | Personnel PL guide | no hard guard | PL matrix and track information |
| `/maps` | Interactive map | no hard guard | Map image and marker filtering |
| `/author` | Author Dashboard | guarded | Author, PL7, and eligible L6 only |
| `/personnel` | Personnel Management | guarded | PL7 only |
| `/settings` | Settings | authenticated context | Theme, account, PL7 extraction |
| `/news/:id` | News detail | no hard guard | News body and attachments |
| `/management` | Management workflow | non-guest | Request forms and review queue |
| `/chat` | Chat | non-guest | Conversation list, messages, groups, invites |
| unknown route | Not Found | no | Not found page displays requested path |

## 8. Browser And Device Coverage

Minimum browser matrix:

| Browser | Priority |
| --- | --- |
| Chrome latest | P0 |
| Edge latest | P0 |
| Firefox latest | P1 |
| Safari latest if available | P1 |
| Mobile Chrome or mobile Safari | P0 responsive check |

Viewport matrix:

| Viewport | Expected |
| --- | --- |
| `390 x 844` | Mobile layout usable, sidebar accessible, no horizontal overflow |
| `768 x 1024` | Tablet layout usable |
| `1366 x 768` | Desktop layout usable |
| `1920 x 1080` | Large desktop layout usable |

## 9. Global UI Checks

Run on both localhost and `morneven.com`.

| Area | Expected |
| --- | --- |
| App shell | Sidebar, header, account area, notification bell, and content area render |
| Theme | Theme toggle persists after reload |
| Navigation | Sidebar route links navigate without full page crash |
| Direct URL refresh | Public deploy should serve app routes through Vercel rewrite |
| Loading state | Route fallback should appear briefly for lazy routes |
| Toasts | Success and error messages appear for local actions |
| Empty states | Search with no results shows a controlled empty message |
| Images | Card images use lazy browser loading where implemented |
| Local persistence | Created or edited demo data remains after reload in same browser |
| Cross-browser persistence | Data does not sync across browsers because there is no backend authority |

## 10. LocalStorage Data And Cleanup

The frontend stores demo state in browser localStorage.

Important keys:

| Key | Purpose |
| --- | --- |
| `auth_state` | Demo auth state and password snapshot |
| `theme` | Light or dark preference |
| `morneven_projects` | Project data |
| `morneven_characters` | Character lore data |
| `morneven_places` | Place lore data |
| `morneven_technology` | Technology lore data |
| `morneven_creatures` | Creature lore data |
| `morneven_other` | Other lore data |
| `morneven_events` | Event lore data |
| `morneven_gallery` | Gallery data |
| `morneven_news` | News data |
| `morneven_map_markers` | Map markers |
| `morneven_map_image` | Map image URL |
| `morneven_cc_settings` | Command Center settings |
| `morneven_chat_conversations_v2` | Chat conversations |
| `morneven_chat_messages_v2` | Chat messages |
| `morneven_chat_last_read_v1` | Chat read state |
| `morneven_mgmt_requests` | Management requests |
| `morneven_mgmt_teams` | Management teams |
| `morneven_mgmt_quotas` | Submission quotas |
| `morneven_mgmt_seeded_v1` | Management seed flag |
| `morneven_notifications` | Notification inbox |
| `morneven_extraction_history_v1` | Extraction job history |

Cleanup methods:

- Preferred for full reset: open browser devtools, clear site data for the target origin, then reload.
- Targeted reset: remove only the affected `morneven_*` key and reload.
- Auth reset: remove `auth_state` or use Logout.
- Keep screenshots of created QA records before clearing data if defects need reproduction.

Do not assume QA data created in one browser exists in another browser or on another machine.

## 11. Feature QA Checklist

### Landing And Auth

Positive tests:

- Open `/` and verify entry CTA navigates to `/auth`.
- Login with `author@morneven.com` and any 6+ character password.
- Login with seeded personnel email and any 6+ character password.
- Register a new user with valid email, username, and password.
- Enter Guest Mode.
- Logout and verify protected author routes redirect.

Negative tests:

- Login with invalid email.
- Login with password shorter than 6 chars.
- Register with username shorter than 3 chars.
- Open `/author` while logged out and verify redirect to `/auth`.

### Command Center

Positive tests:

- Open `/home`.
- Verify stats, projects, news, lore sections, gallery, and quick actions render according to current settings.
- Use Author Dashboard Command Center settings to toggle sections.
- Change item limits and manual selections.
- Reload and verify settings persist in same browser.

Negative tests:

- Set low item limits and confirm page does not over-render.
- Clear manual selections and confirm automatic ordering returns.

### Projects

Positive tests:

- Open `/projects`.
- Switch status tabs such as Planning, On Progress, Completed, Archived.
- Search project text.
- Open a project detail page.
- Verify overview, patches, docs, and metadata tabs.
- As author, create a QA project from Author Dashboard.
- Edit QA project.
- Archive or delete QA project if UI action exists for the path under test.

Negative tests:

- Search for a random string and verify empty state.
- Open unknown project ID and verify not found handling.

### Gallery

Positive tests:

- Open `/gallery`.
- Search gallery.
- Filter by image or video.
- Sort gallery.
- Open gallery detail.
- Add comment.
- Add reply.
- Delete own comment or reply if UI allows.
- As author, create and edit QA gallery item.

Negative tests:

- Try empty comment or reply.
- Open unknown gallery ID.
- Verify non-owner or low-privilege user cannot edit items outside permission scope.

### Lore

Positive tests:

- Open `/lore`.
- Test all category tabs: Characters, Places, Technology, Creatures, Events, Other, Personnel.
- Search each major category.
- Toggle sort where available.
- Open detail pages for each category.
- Verify docs, metadata, and discussions render.
- Verify restricted `[Lx+]` content behavior by changing PL preview as author.

Negative tests:

- Search random text and verify empty state.
- Open unknown lore ID.
- Verify lower PL cannot see restricted content.

Known caveat:

- Lore Events can be browsed and viewed, but Author Dashboard event create, edit, and delete is not fully available in the current demo.

### Maps

Positive tests:

- Open `/maps`.
- Verify map image renders.
- Filter markers by status.
- Click markers and verify marker detail.
- As author, update map marker data from Author Dashboard Map tab.
- Reload and confirm local persistence.

Negative tests:

- Test missing or invalid marker image URL if editor allows.
- Test marker coordinates at edge values `0` and `1`.

### Author Dashboard

Access tests:

- Author account can enter `/author`.
- PL7 can enter `/author`.
- L6 executive can enter `/author`.
- L6 field can enter with limited section access.
- L6 mechanic can enter with limited section access.
- Guest and L0 to L5 should be redirected or blocked.

Content tests:

- Create, edit, and delete QA content for Projects, Gallery, News, and supported Lore categories.
- Add docs and metadata.
- Use restricted marker helper if available.
- Use file input and confirm preview behavior.

Known caveats:

- File inputs use object URLs and are not durable after browser memory reset.
- Some editor fields still allow weak or empty values. QA should report any save that creates unusable content.
- Project or Lore `NEW` links may navigate to Author Dashboard without auto-opening create mode.

### Personnel Management

Positive tests:

- Login as author or PL7.
- Open `/personnel`.
- Filter personnel.
- Create QA personnel record.
- Edit non-PL7 personnel.
- Bulk select visible personnel.
- Bulk update allowed level or track.

Negative tests:

- Non-PL7 user should not access `/personnel`.
- L7 personnel should not be deletable.
- Invalid email or missing username should be blocked if UI validation is present.

### Management Workflow

Positive tests:

- Login as non-guest personnel.
- Open `/management`.
- Submit transfer request with reason.
- Submit clearance request with required obligation agreement.
- Submit personal submission.
- Submit team submission when eligibility is met.
- Create or update team where eligible.
- Login as eligible reviewer and approve or reject request.
- Verify notifications and side effects after approval where implemented.

Negative tests:

- Guest should not access workflow.
- Empty reason should block submission.
- User should not approve own request.
- Ineligible reviewer should not see or should not be able to decide restricted request.

### Chat

Positive tests:

- Login as non-guest.
- Open `/chat`.
- Verify Institute and Division system-managed groups.
- Send text message.
- Send message with attachment under 5 MB.
- Reply to a message.
- Create DM with another user.
- Create manual group.
- Invite user to manual group.
- Accept or reject invite as invited user.
- Rename manual group if owner or admin.
- Promote or demote member if owner.
- Kick member if owner or admin.
- Mark conversation read by opening it.

Negative tests:

- Guest should not see Chat in sidebar.
- Empty message without attachment should not send.
- DM target cannot be self.
- Attachment above 5 MB should be rejected.
- System-managed group cannot be renamed, left, kicked, or manually invited.

### Notifications

Positive tests:

- Trigger notification from chat mention or management action.
- Open notification bell.
- Mark one notification as read.
- Mark all as read.
- Clear notification if UI allows.
- Verify unread badge changes.

Negative tests:

- Notification list should not show another user's private notifications.
- Empty notification list should render a controlled state.

### Settings And Extraction

Positive tests:

- Open `/settings`.
- Toggle theme and reload.
- Verify account role, PL, and track.
- As PL7, enter the same password used during FE login.
- Type exact `CONFIRM`.
- Start extraction in `db`, `images`, and `all` mode if QA scope allows.
- Verify extraction history appears.
- Download generated artifact if available.

Negative tests:

- Non-PL7 should not run extraction.
- Wrong password should keep run button disabled.
- Wrong confirm phrase should keep run button disabled.

Important:

- Extraction password validation uses the frontend demo password snapshot, not backend auth.

## 12. Lazy Load And Large Content Checks

Areas expected to avoid rendering all large content at once:

| Area | Expected QA Check |
| --- | --- |
| Gallery list | Initial visible cards should be limited by responsive page size, with load more or pagination behavior |
| Lore list | Initial cards should be limited by responsive page size per category |
| Projects list | Uses fixed page size and should not render all project cards at once |
| Author Dashboard lists | Uses paginated data loading for large admin lists |
| Command Center | Section item limits should constrain visible cards |
| Discussions | Comments and replies should initially render only a subset and expose load-more controls |
| Images | Card images should include browser lazy loading where implemented |

QA checks:

- Add or seed many items in localStorage and confirm the page remains usable.
- Verify "load more" or pagination controls increase visible content incrementally.
- Search or filter should reset to the first page or first result set.
- Mobile viewport should not freeze or overflow when many items exist.

## 13. Accessibility And UX Checks

Minimum checks:

- Keyboard can tab through login, sidebar, buttons, and forms.
- Dialogs and dropdowns can be dismissed.
- Form errors are visible near fields.
- Buttons show disabled state when action is not allowed.
- Text contrast is readable in light and dark theme.
- Images have useful alt text where expected.
- Mobile sidebar or navigation remains usable.

## 14. Smoke Test Script

Run this first on each target environment:

1. Open `/`.
2. Navigate to `/auth`.
3. Login as `author@morneven.com` with password `anything6`.
4. Verify redirect to `/home`.
5. Open `/projects` and one project detail.
6. Open `/gallery` and one gallery detail.
7. Open `/lore`, switch through each category, open one detail.
8. Open `/maps`.
9. Open `/author`.
10. Open `/personnel`.
11. Open `/management`.
12. Open `/chat`.
13. Open `/settings`.
14. Logout.
15. Enter Guest Mode and verify Chat and Management are hidden.

Minimum pass criteria:

- No route crashes.
- No blank screen.
- No uncontrolled console error that blocks use.
- Auth demo behavior matches Section 5.
- Sidebar visibility matches role and PL expectations.
- Main content loads on desktop and mobile viewport.

## 15. Full Functional QA Order

Recommended order:

1. Localhost smoke test.
2. Public deploy smoke test.
3. Auth and role access matrix.
4. Read-only browsing for Projects, Gallery, Lore, Maps, News.
5. Author Dashboard CRUD on localhost.
6. Personnel management on localhost.
7. Management workflow on localhost.
8. Chat workflow on localhost.
9. Notification workflow on localhost.
10. Settings and extraction on localhost.
11. Lazy load and large content checks.
12. Responsive browser matrix.
13. Cleanup localStorage and rerun smoke test.

## 16. Defect Report Requirements

For every FE defect, capture:

- Environment: localhost or `morneven.com`.
- Browser and version.
- Viewport size.
- Route.
- Account email, role, PL, and track.
- Password value length only, not the actual password.
- Steps to reproduce.
- Expected result.
- Actual result.
- Screenshot or video.
- Console error if present.
- Relevant localStorage key if the issue is persistence-related.

## 17. Known Constraints

- FE auth is a demo and accepts any password with minimum length 6.
- FE authority is browser-local and can be tampered with through localStorage.
- Most data is loaded from JSON seed and persisted in localStorage.
- FE is not yet connected to the backend REST API for most tested workflows.
- File upload previews are not durable backend files.
- Multi-user and cross-device sync should not be expected.
- Extraction is frontend-generated demo output, not a backend-secured export.
- Some content editor validation remains weak and should be reported if it allows unusable demo data.

## 18. QA Verdict Template

Use this format at the end of a QA run:

```text
Target:
Browser:
Viewport:
Build or commit:
Account:
Scope:

Smoke result:
Auth result:
Navigation result:
Content browsing result:
CRUD result:
Workflow result:
Responsive result:
Known limitations accepted:
Blocking defects:
Non-blocking defects:
Cleanup completed:
Final verdict:
```

## 19. Test Data Naming Convention

Use this naming pattern for every QA-created record:

```text
QA-YYYYMMDD-<tester>-<feature>-<short-purpose>
```

Examples:

| Feature | Example |
| --- | --- |
| Project title | `QA-20260502-RINA-project-create` |
| Gallery title | `QA-20260502-RINA-gallery-comment` |
| News headline | `QA-20260502-RINA-news-detail` |
| Lore name | `QA-20260502-RINA-character-restricted` |
| Chat group | `QA-20260502-RINA-chat-group` |
| Management request reason | `QA-20260502-RINA-clearance-request` |
| Personnel username | `qa-rina-20260502` |

Rules:

- Use the same run ID for related records.
- Do not reuse a prior run ID unless retesting the same defect.
- Include the run ID in screenshots and defect reports when possible.
- Delete QA-created records at the end of local QA if the UI supports deletion.
- If deletion is not available, clear the related localStorage key after screenshots are captured.

## 20. Fixed Seed Targets For Smoke Testing

Use these seed targets so QA runs are repeatable.

| Area | Seed ID | Display Text | Route |
| --- | --- | --- | --- |
| Project | `proj-001` | `Project Aethon` | `/projects/proj-001` |
| Project | `proj-002` | `Worldshard Engine` | `/projects/proj-002` |
| Gallery | `gal-001` | `Kael Vorthane - Character Concept` | `/gallery/gal-001` |
| Gallery | `gal-002` | `Iron Citadel - Exterior View` | `/gallery/gal-002` |
| Character | `char-001` | `Kael Vorthane` | `/lore/characters/char-001` |
| Place | `place-001` | `The Iron Citadel` | `/lore/places/place-001` |
| Technology | `tech-001` | `Nexus Drive` | `/lore/tech/tech-001` |
| Creature | `crea-001` | `Glassfang Stalker` | `/lore/creatures/crea-001` |
| Event | `evt-001` | `The Final Resonance` | `/lore/events/evt-001` |
| Other Lore | `other-001` | `Gemora Danger Level (DL) Scale` | `/lore/other/other-001` |
| PL Matrix | `other-005` | `Personnel Level (PL) Clearance Matrix` | `/lore/personnel` |
| News | `news-007` | `Marine sighting reported off the Coral Reach` | `/news/news-007` |
| News | `news-008` | `Amethys Frame branch review scheduled` | `/news/news-008` |
| Personnel | `psn-001` | `author@morneven.com` | `/personnel` |
| Personnel | `psn-003` | `v.kessler@morneven.com` | `/personnel` |

Smoke expected results:

- Every fixed route above must render a valid page, not a blank screen.
- Detail page title must match the display text in the table.
- Unknown detail IDs must render a controlled not-found state, not crash the app.
- Direct refresh on `morneven.com` must keep the route and render the app because Vercel rewrites all app routes to `index.html`.

## 21. Expected UI Details By Surface

Use this table for stricter component-level checks.

| Surface | Required UI Elements | Required Empty Or Error State |
| --- | --- | --- |
| `/auth` Login | Email field, password field, Access button, Guest Mode button, Register toggle | Invalid email shows `Valid email required`; short password shows `Min 6 characters` |
| `/auth` Register | Email field, username field, password field, Register button, Login toggle | Short username shows `Min 3 characters`; short password shows `Min 6 characters` |
| Sidebar | Home, Projects, Gallery, Lore, Maps, Settings, Logout or account control | Guest should not see Chat or Management |
| Notification Bell | Bell icon, unread badge when count is above 0, dropdown list | Empty list should show a controlled empty state |
| Command Center | Stats, Projects, News, Key Personnel, Key Locations, Technology, Recent Gallery, Quick Navigation when enabled | Disabled sections should disappear without leaving broken gaps |
| Projects List | Status tabs, project cards, title, status label, short description, detail link | No result search shows empty state |
| Project Detail | Overview tab, Patches tab, Docs tab, Metadata tab | Unknown ID shows not found state |
| Gallery List | Search, type filter, sort, gallery cards, media thumbnail | No result search shows empty state |
| Gallery Detail | Media display, title, caption, comment section, reply section | Empty comment or reply should not create unusable blank content |
| Lore Index | Category tabs, search, sort, cards per category | No result search shows category empty state |
| Lore Detail | Overview content, documentation area, metadata or details, discussion section | Restricted blocks hidden for insufficient PL |
| Maps | Map image, status filters, marker cards or marker detail | Missing marker data should not crash |
| Author Dashboard | Section tabs, create button, edit form, save action, cancel action | Unauthorized section must be hidden or inaccessible |
| Personnel | Filter/search, personnel rows, edit actions, bulk toolbar when selected | Non-PL7 should be redirected or blocked |
| Management | Request type selector, reason input, request list, review queue | Missing required reason blocks submit |
| Chat | Conversation list, message pane, composer, attachment action, member management when eligible | Empty message with no attachment should not send |
| Settings | Theme control, account summary, extraction controls for PL7 | Wrong password or wrong `CONFIRM` keeps extraction disabled |

## 22. Form Field Checklist

Current FE validation is demo-grade. QA should verify current behavior and report cases where weak validation allows unusable content.

| Form | Required Fields To Test | Expected Current Behavior |
| --- | --- | --- |
| Login | `email`, `password` | Email format and password min 6 are enforced |
| Register | `email`, `username`, `password` | Email format, username min 3, password min 6 are enforced |
| Project editor | `title`, `status`, `shortDesc`, `fullDesc`, optional patches, docs, metadata | Status enum is UI-controlled; report if blank title or blank required description can be saved |
| Gallery editor | `type`, `title`, `caption`, optional thumbnail, video URL, tags | Type enum is UI-controlled; report if blank title or caption can be saved |
| Lore editor | `name` or `title`, `shortDesc`, `fullDesc`, optional docs, metadata | Category controls available for supported lore types; Events authoring is a known caveat |
| News editor | `text`, optional `hasDetail`, `body`, `thumbnail`, attachments | Detail fields should be meaningful when detail is enabled |
| Map editor | `name`, `status`, `x`, `y`, `description`, optional lore link | Coordinates should stay within `0` to `1` if editor exposes numeric fields |
| Personnel create | `username`, `email`, level, track | Username and email are required; L7 record deletion must be blocked |
| Management request | `kind`, `reason`, kind-specific payload | Empty reason must block submit |
| Chat message | `text` or attachment | Text or at least one attachment required |
| Manual chat group | `name`, selected members | Name and at least one invitee required |
| Extraction | password snapshot, exact `CONFIRM`, mode | Only PL7 with matching demo password can run |

Exact error messages known from code:

| Case | Expected Message |
| --- | --- |
| Invalid login or register email | `Valid email required` |
| Register username under 3 chars | `Min 3 characters` |
| Login or register password under 6 chars | `Min 6 characters` |

If another form blocks submission without a text error, record that as current behavior and only file a defect if the UX is unclear.

## 23. Permission Matrix

Legend:

| Mark | Meaning |
| --- | --- |
| `Yes` | Expected access |
| `Limited` | Expected access with scope restrictions |
| `No` | Expected blocked, hidden, or redirected |

| Feature | Guest PL0 | Personel PL1-PL5 | L6 Executive | L6 Field | L6 Mechanic | L6 Logistics | Author or PL7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Browse public content | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Chat | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Management page | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Author Dashboard entry | No | No | Yes | Yes | Yes | Yes | Yes |
| Author Dashboard Projects | No | No | Yes | No | Yes | No | Yes |
| Author Dashboard Lore Characters | No | No | Yes | No | No | No | Yes |
| Author Dashboard Lore Places | No | No | Yes | Yes | No | No | Yes |
| Author Dashboard Lore Technology | No | No | Yes | No | Yes | No | Yes |
| Author Dashboard Lore Creatures | No | No | Yes | Yes | No | No | Yes |
| Author Dashboard Lore Other | No | No | Yes | No | No | No | Yes |
| Author Dashboard Gallery | No | No | Yes | Limited own uploads | Limited own uploads | Limited own uploads | Yes |
| Author Dashboard News | No | No | Yes | No | No | No | Yes |
| Command Center settings | No | No | Yes | Limited by visible section access | Limited by visible section access | Limited by visible section access | Yes |
| Map editing | No | No | Yes | No | No | No | Yes |
| Personnel Management | No | No | No | No | No | No | Yes |
| Discussion moderation | No | No | Yes | No | No | No | Yes |
| PL7 extraction | No | No | No | No | No | No | Yes |

Permission defect rules:

- If a blocked user can enter a restricted page, severity is at least P1.
- If a restricted tab is visible but action is disabled and clearly explained, record as pass.
- If a restricted action appears enabled but silently fails, file P2 or higher depending impact.
- Client-side permission is not security authority in this demo, but UI permission expectations still must be correct.

## 24. Cross-Flow Test Matrix

These scenarios validate that one feature updates another visible surface.

| ID | Flow | Steps | Expected |
| --- | --- | --- | --- |
| CF-01 | Author creates project, public project list updates | Login as author, create `QA-...-project-create`, open `/projects`, search run ID | Created project appears in list and detail route opens |
| CF-02 | Author edits project, detail updates | Edit QA project short description, open detail page | Detail page reflects updated text after reload |
| CF-03 | Author creates gallery item, gallery detail supports discussion | Create QA gallery item, open detail, add comment and reply | Item appears in gallery, comment and reply persist after reload |
| CF-04 | Author changes Command Center selection | Select fixed project `proj-001` and gallery `gal-001` in Command Center settings | `/home` shows selected items in configured order |
| CF-05 | Personnel management affects chat system groups | Edit a non-L7 personnel track or create personnel if allowed, open Settings and run chat reconciliation if available, then open Chat | Division membership reflects latest local personnel data |
| CF-06 | Management personal submission creates gallery content | Submit personal submission as eligible user, approve as reviewer | Approved request creates or exposes gallery item and notification |
| CF-07 | Management team submission creates project content | Submit team project as eligible user, approve as reviewer | Approved request creates or exposes project item and notification |
| CF-08 | Chat mention creates notification | Mention another user in chat using `@username`, login as mentioned user | Notification bell shows unread mention |
| CF-09 | Notification read state updates badge | Create or trigger notification, mark read | Badge decreases or disappears |
| CF-10 | Settings extraction uses demo password snapshot | Login with password `anything6`, open Settings, enter `anything6` and `CONFIRM` | Extraction run button enables for PL7 |

If a cross-flow cannot be completed because current demo code lacks backend sync, mark it as known demo limitation only when this guide or existing docs already identify that limitation.

## 25. Visual Regression Acceptance Criteria

Priority pages for screenshots:

| Priority | Route | Viewports |
| --- | --- | --- |
| P0 | `/` | Mobile, desktop |
| P0 | `/auth` | Mobile, desktop |
| P0 | `/home` | Mobile, desktop |
| P0 | `/projects` | Mobile, desktop |
| P0 | `/gallery` | Mobile, desktop |
| P0 | `/lore` | Mobile, desktop |
| P0 | `/chat` | Mobile, desktop |
| P0 | `/author` | Desktop |
| P1 | `/personnel` | Desktop |
| P1 | `/management` | Mobile, desktop |
| P1 | `/settings` | Mobile, desktop |
| P1 | Detail routes from Section 20 | Desktop |

Acceptance criteria:

- No horizontal page overflow at `390 x 844`, `768 x 1024`, `1366 x 768`, or `1920 x 1080`.
- No critical text overlaps buttons, cards, sidebar, dialog content, or form fields.
- Primary CTA buttons remain visible and clickable.
- Sidebar collapse or mobile navigation must not cover active form fields permanently.
- Cards in a grid should keep consistent spacing and should not overlap.
- Modal, dropdown, popover, and notification panels should remain inside viewport or be scrollable.
- Skeleton or loading fallback should not remain indefinitely after route load.
- Image aspect ratio may crop intentionally, but should not distort faces or important UI thumbnails beyond acceptable object-cover behavior.
- Dark and light themes must preserve readable contrast for body text, labels, buttons, and disabled states.

Baseline screenshot rule:

- If no formal baseline exists, capture fresh baseline screenshots from a known-good run on localhost.
- Use the same browser, viewport, route, role, and localStorage reset state when comparing.
- Treat differences from seeded random timestamps, unread counts, and QA-created records as expected dynamic differences.

## 26. Console And Network Checklist

Console checks:

| Severity | Console Condition |
| --- | --- |
| P0 | Uncaught runtime exception causing blank screen or broken navigation |
| P0 | React error boundary or render crash on P0 route |
| P1 | Repeated console error on normal user action |
| P1 | Failed dynamic import or missing route chunk |
| P2 | Controlled warning that does not block use but appears repeatedly |
| P3 | Known dev-only warning with no user impact |

Known acceptable warnings:

- React Router future flag warnings in tests or development.
- Browserslist stale data warning during build.
- Large JS chunk warning during build, as long as build succeeds.
- Demo localStorage persistence warnings only if the UI still works and no data loss occurs.

Blocking console or network failures:

- Blank screen after route navigation.
- Missing JS or CSS asset on `morneven.com`.
- Infinite loading state.
- Image or media failure that breaks layout rather than showing a controlled fallback.
- Repeated storage quota error after normal QA-sized data.
- Any failed request to a required deployed asset that prevents use.

Network checks:

- On `morneven.com`, direct refresh for app routes should return the app HTML, not a platform 404.
- Static assets should return `200`.
- Missing optional image URLs in seed data are acceptable only when UI shows a controlled placeholder.
- No endpoint REST integration is required for most FE workflows yet because the current system is demo/localStorage-backed.

## 27. Severity Rubric

| Severity | Definition | Examples |
| --- | --- | --- |
| P0 Blocker | QA or demo cannot continue on a primary path | App blank screen, login page unusable, `/home` crashes, production deploy cannot load |
| P1 Critical | Major feature broken or permission exposes clearly wrong UI | Author route open to guest, Chat unusable for personnel, create action corrupts local data, route refresh 404 on public deploy |
| P2 Major | Important workflow degraded but workaround exists | Search broken in one module, edit saves but detail does not refresh until manual reload, visual overlap blocks part of a secondary panel |
| P3 Minor | Low impact issue or polish defect | Typo, minor spacing inconsistency, non-blocking console warning, missing optional placeholder |

Default severity guidance:

- Permission bypass in UI: P1 unless it exposes only non-sensitive demo content, then P2.
- Data loss for QA-created content after same-browser reload: P1.
- Data not syncing across browsers: known limitation, not a defect.
- Password accepted without backend verification: known demo limitation, not a defect.
- Missing backend REST calls: known limitation unless the UI claims live server sync.

## 28. Repeatable Regression Pack

Run this pack after meaningful FE changes.

| Pack | Test Cases |
| --- | --- |
| Auth pack | Login author, login seeded personnel, register new demo user, Guest Mode, logout, guarded route redirect |
| Navigation pack | Visit every route in Section 7 and direct refresh P0 routes |
| Content pack | Project, gallery, lore, news fixed seed details from Section 20 |
| CRUD pack | Create and edit QA project, gallery, news, one supported lore item |
| Permission pack | Guest, PL1-PL5, L6 executive, L6 field, L6 mechanic, L6 logistics, author or PL7 |
| Workflow pack | Management request, approval or rejection, notification check |
| Chat pack | DM, manual group, system group, message, reply, attachment, unread state |
| Visual pack | P0 screenshot routes in mobile and desktop |
| Persistence pack | Reload after each localStorage mutation and verify data remains |
| Cleanup pack | Delete QA records where possible, then clear localStorage and rerun smoke |
