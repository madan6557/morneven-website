# Frontend Feature Validation Report

**Project:** Morneven Institute Website  
**Repository:** `morneven-website`  
**Branch validated:** `development`  
**Validation date:** 2026-05-01  
**Scope:** Frontend feature completeness, demo readiness, and documentation support  
**Important limitation:** This report evaluates demo readiness only. The frontend does not yet use live REST API endpoints for the reviewed features.

## 1. Objective

Validate the current frontend feature set and document each feature with:

- Feature description.
- How to use it.
- Current validation and access rules.
- Demo status.
- Known gaps and information needed before REST API integration.

## 2. Validation Basis

Reviewed source areas:

- Routing and app shell: `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/components/AppLayout.tsx`.
- Auth and clearance rules: `src/contexts/AuthContext.tsx`, `src/lib/pl.ts`, `src/components/AuthorRoute.tsx`.
- Feature pages: `src/pages/*`.
- Local service layer: `src/services/*`.
- Shared types and seed data: `src/types/index.ts`, `src/data/*.json`.
- Existing docs: `docs/README.md`, `docs/full-platform-readiness-assessment-2026-04-27.md`, `docs/functionality_test.md`.

Executed checks:

| Check | Result | Notes |
|---|---:|---|
| `npm.cmd run test` | Pass | 3 test files, 10 tests passed. React Router v7 future flag warnings are non-blocking. |
| `npm.cmd run lint` | Pass with warnings | 0 errors, 13 warnings. Warnings are Fast Refresh export warnings and hook dependency warnings. |
| `npm.cmd run build` | Pass with warnings | Build completed. Warnings: stale Browserslist data and large JS chunk over 650 kB. |

Seed data available for demo:

| Dataset | Count |
|---|---:|
| Characters | 13 |
| Creatures | 10 |
| Events | 12 |
| Gallery items | 9 |
| Map markers | 10 |
| News items | 8 |
| Other lore | 9 |
| Personnel | 16 |
| Places | 7 |
| Projects | 9 |
| Technology | 19 |

## 3. Status Definitions

| Status | Meaning |
|---|---|
| Ready for demo | Usable in a single browser session using seed data and localStorage persistence. |
| Ready for demo with caveats | Usable for demo, but presenter must avoid or explain a known limitation. |
| Unready for demo | A visible or expected workflow is incomplete enough to avoid during demo. |
| Not production ready | Requires server authority, REST API integration, shared persistence, security, or audit logging. |

## 4. Executive Summary

The frontend is broadly ready for an internal demo. Public browsing, auth mock, content detail pages, Author Dashboard content management, management workflows, chat, notifications, map editing, settings, and PL-based access previews are usable with local seed data and localStorage persistence.

The platform is not production ready because authority and persistence are browser-local. Any user with local access can alter auth state and persisted records. Backend REST endpoints, server-side authorization, file storage, audit trails, and real-time delivery are still required.

Main demo caveats:

- Lore Events can be browsed and viewed, but cannot be created or edited from the Author Dashboard.
- The `NEW` links on Projects and Lore include `action=create`, but the Author Dashboard only reads the `tab` query parameter. During demo, open Author Panel and click `CREATE NEW` manually.
- Most Author Dashboard content forms allow empty text and media fields. Demo data quality depends on presenter discipline until stricter form validation is added.
- Chat, management, notifications, map edits, and content CRUD are local to the current browser profile.

## 5. Feature Inventory

| Feature | Routes or surface | Description | How to use | Validation and rules | Demo status | API readiness notes |
|---|---|---|---|---|---|---|
| Landing page | `/` | Public entry screen for the Morneven portal. | Open `/`, then choose auth flow. | No backend requirement. | Ready for demo | Static frontend route. |
| Authentication | `/auth` | Login, register, and guest mode using local auth state. | Use seeded emails such as `author@morneven.com` or register a new account. Password may be any 6+ character value in demo. | Email must match a basic email pattern. Register username must be at least 3 characters. Password must be at least 6 characters. Guest login assigns guest role. | Ready for demo with caveats | Needs real auth, password handling, sessions, and server role authority. |
| App layout and navigation | App shell, sidebar | Shared navigation, responsive sidebar, logout, account badge, PL preview switcher for author. | After login, use sidebar links. Author can preview PL and track from sidebar. | Sidebar hides Management and Chat for guests. Author Panel appears for author or L6+. Personnel appears for L7+. | Ready for demo | Needs server-backed identity and access claims. |
| Command Center | `/home` | Dashboard with stats, news, projects, key lore entries, gallery, and quick links. | Open `/home`. Configure visible sections in Author Panel under Command Center. | Settings are read from localStorage. Manual selections override item limits. | Ready for demo | Needs REST-backed dashboard data and server-side personalization. |
| Projects browser | `/projects`, `/projects/:id` | Project list with status tabs, archive tab, detail tabs for overview, patches, docs, and metadata. | Open Projects, filter by status, select a project. Authors can manage project content from Author Panel. | Project status is one of Planning, On Progress, On Hold, Completed, Canceled. Archived projects are hidden from normal views and visible in Archived tab. | Ready for demo | CRUD currently uses localStorage. Needs `/projects` REST endpoints and file storage. |
| Gallery browser | `/gallery`, `/gallery/:id` | Gallery grid, detail view, image/video support, comments and replies. | Open Gallery, search, open an item, add comments or replies. | Item type is image or video. Gallery comment and reply text is handled locally. | Ready for demo | Needs shared media storage, comment APIs, moderation, and permissions. |
| Lore Wiki browser | `/lore`, `/lore/:category`, detail routes | Searchable lore index for Characters, Places, Technology, Creatures, Events, Other, and Personnel. Detail pages render descriptions, docs, metadata, discussions, and restricted blocks. | Open Lore, search, choose category, open an entry. Use Personnel tab for PL reference. | Search matches name/title and short description. Sort toggles A-Z and Z-A. Restricted text uses `[Lx+]...[/Lx+]` markers with optional track hint. PL threshold controls visibility. | Ready for demo with caveats | Needs REST endpoints for each lore category, discussions, metadata, and permission-filtered content. |
| Lore Events browsing | `/lore` Events tab, `/lore/events/:id` | Event cards and detail pages with category, era, date, impact, related links, docs, metadata, and discussions. | Open Lore, select Events, open an event. | Events are loaded from seed data through `getEvents` and `getEvent`. Discussions persist locally. | Ready for demo for read/detail | Author create/edit/delete for events is missing from Author Dashboard. Add before content-management demo. |
| Interactive map | `/maps`, Author Panel Map tab | Displays map markers with status, coordinates, descriptions, and lore links. Author Panel can update map image and markers. | Open Maps. In Author Panel, go to Map, add or edit markers, then save. | Marker status is safe, caution, danger, restricted, or mission. X and Y inputs are intended as normalized 0 to 1 coordinates. | Ready for demo with caveats | Needs server persistence, coordinate validation, shared image storage, and role-based marker editing. |
| News feed and detail | `/home`, `/news/:id`, Author Panel News tab | News feed with optional detail pages, body text, thumbnail, and attachments. | In Author Panel, open News, create or edit a headline, enable detail page if needed. Open detail news from Command Center. | News detail body and attachments are only saved when `hasDetail` is enabled. Attachment types are image, video, or link. | Ready for demo with caveats | Headline/date are not hard-required in the editor. Needs REST CRUD and media/link validation. |
| Author Dashboard | `/author` | Central content management for Projects, Lore categories, Gallery, News, Command Center, and Map. | Login as author or eligible L6/L7 user. Open Author Panel and choose a tab. | Author and L7 have full access. L6 executive has broad access. L6 field can manage Lore Places, Lore Creatures, and own Gallery uploads. L6 mechanic can manage Projects, Lore Technology, and own Gallery uploads. L6 logistics can manage own Gallery uploads only. | Ready for demo with caveats | Client-side guard only. Needs server ACL, audit logs, stricter validation, and REST integration. |
| Author content editor | Author Panel forms | Create and update project, lore, gallery, docs, metadata, field notes, observations, character contributions, and patch notes. | Click `CREATE NEW` or edit an existing item in Author Panel, update fields, then save. | Select fields enforce enums where present. Dynamic lists support add/remove. File inputs create object URLs only for demo. | Ready for demo with caveats | Needs required-field validation, file upload service, URL validation, and server-side schema validation. |
| Personnel management | `/personnel` | L7-only personnel registry, create/edit/delete users, filter, bulk update level and track. | Login as author or L7, open Personnel, edit records or create a user. | Only PL7 can enter. Create requires username and email. New create UI does not expose L7. L7 records cannot be deleted. Bulk update can modify selected users. | Ready for demo | Needs server admin endpoints, uniqueness checks, audit trail, and role assignment policy. |
| Management workflow | `/management` | Request system for track transfer, clearance upgrade, personal/team submission, team management, review queue, and promotion. | Login as non-guest personnel, open Management, submit requests, then review as eligible supervisor. | Guests blocked. Reason is required for all requests. PL7 cannot transfer. Clearance application supports L1 to L4 path. Personal/team submission requires title and caption. Team registration requires PL3 and at least one selected member. Executive promotion requires PL4, plan, and reason. Reviewer eligibility depends on request kind, PL, track, and no self-approval. | Ready for demo | Needs REST workflow engine, server-side reviewer checks, request audit history, quota jobs, and notifications. |
| Chat | `/chat` | Direct messages, manual groups, team/division/institute channels, invites, attachments, replies, unread handling, member management. | Login as personnel, open Chat, start DM or group, send messages, attach files, manage group settings. | Authenticated users only. Message requires text or attachment. File size cap is 5 MB. DM target cannot be self. Manual group requires name and members. System-managed groups cannot be renamed, kicked, left, or manually invited. Owners/admins manage members. | Ready for demo with caveats | Needs WebSocket or polling, message REST APIs, server membership reconciliation, real attachment storage, delivery/read receipts, and moderation. |
| Notifications | Header notification bell | Local notification inbox for messages, mentions, requests, warnings, and system events. | Trigger via chat or management approvals, then open the bell. | Notifications are scoped by recipient or wildcard. Users can mark read, mark all read, and clear. | Ready for demo with caveats | Needs server notification API and push or real-time delivery. |
| Settings | `/settings` | Theme toggle, account summary, obligation counters, and PL7 extraction utility. | Open Settings. PL7 users can run extraction after password and `CONFIRM`. | Extraction requires PL7, matching password snapshot, and exact `CONFIRM` phrase. Extraction history expires after 30 days. | Ready for demo with caveats | Password snapshot is local only. Extraction needs backend job handling, secure export authorization, and durable storage. |
| Data extraction | Settings PL7 section | Builds local ZIP exports for DB JSON and image manifests. | Login as author, enter current demo password, type `CONFIRM`, choose mode, start extraction. | Modes are `all`, `db`, or `images`. Processing is simulated with local Blob generation. | Ready for demo with caveats | Needs server job queue, retention policy, signed downloads, and access logging. |
| Discussions and mentions | Lore detail pages, Gallery detail | Comments, replies, edits, deletes, and personnel mentions. | Add a comment or reply on a detail page. Type `@` for mention suggestions. | Discussion CRUD persists locally per entity. Mention suggestions come from personnel registry. Moderation is available where viewer is allowed. | Ready for demo with caveats | Needs discussion REST APIs, mention notifications, moderation logs, and access enforcement. |
| Theme preference | Settings, app mount | Dark/light theme persistence. | Toggle theme from Settings or sidebar surfaces. | Theme is persisted to localStorage and defaults to system preference. | Ready for demo | Needs optional profile preference endpoint if theme should follow user account. |

## 6. Validation Rules Summary

### Auth and Identity

| Rule | Current implementation |
|---|---|
| Login | Looks up seeded personnel by email. Unknown email becomes `personel`, except `author@morneven.com` and `admin@morneven.com`, which become author. |
| Register | Requires email, username, and password validation. New registered users start as PL1 executive. |
| Guest mode | Authenticates as guest with PL0. |
| Password | Only stored as a local password snapshot for demo verification. No backend password validation exists. |

### Clearance and Author Access

| Rule | Current implementation |
|---|---|
| Restricted content | `[L3+]`, `[L4+]`, `[L5+]`, and similar blocks are hidden until viewer PL meets the threshold. Optional `track=` is stored as a hint, not enforced as a hard gate. |
| Author Panel entry | Author role, L7, and any L6 can enter. Section access is narrower by track. |
| Full content authority | Author role and L7 can access all Author Panel sections. |
| L6 executive | Can access author sections broadly. |
| L6 field | Can access Lore Places, Lore Creatures, and own Gallery uploads. |
| L6 mechanic | Can access Projects, Lore Technology, and own Gallery uploads. |
| L6 logistics | Can access own Gallery uploads only. |
| Personnel page | Requires L7. |
| Gallery ownership | L7 and author can modify all items. L6 users can only modify items stamped with their username. Legacy seed items without uploader are treated as author-owned. |

### Management Workflow

| Workflow | Current validation |
|---|---|
| Transfer | PL7 cannot transfer. User selects a target track different from current track. Reason required. Reviewer is PL5 of target track, or PL7. |
| Clearance upgrade | Supports standard L1 to L4 path. User must agree to target PL obligations. Reason required. Reviewer is PL4 of same track, or PL7. |
| Personal submission | Title and caption required. Reason required. Approval creates a Gallery item and bumps monthly quota. |
| Team submission | Requires PL3+ team lead with a team. Title and caption required. Approval creates a Project and bumps yearly quota. |
| Team creation | Requires PL3+. UI requires team name and at least one selected PL2 member from same track. The copy says 2 to 5 members including leader, and the implementation allows leader plus 1 to 4 selected members. |
| Team change | Requires selected team and member username. Reason required through shared request validation. |
| Executive promotion | Requires current PL4 in UI. Requires strategic plan and reason. Reviewer is PL6 or PL7. |

### Chat

| Rule | Current implementation |
|---|---|
| Access | Authenticated users only. Sidebar hides Chat for guest role. |
| Message send | Text or at least one attachment is required. |
| Attachment size | 5 MB demo cap per file. Attachments are stored as data URLs. |
| DM creation | Target must exist and cannot be current user. Existing same pair is reused. |
| Manual group creation | Group name and at least one invitee required. Invitees start with invited status. |
| Member management | Owner can promote/demote. Owner and admin can kick, with limits. System-managed groups are locked. |
| Auto groups | Institute and division groups are reconciled from personnel data. PL7 auto-joins all division groups. |

## 7. Completeness Gaps

| Gap | Impact | Recommended action |
|---|---|---|
| REST API not connected | All data authority is local to browser. Cross-device and multi-user demos will diverge. | Implement the backend contracts and swap local service functions to API calls. |
| Lore Event authoring missing | Events are visible and detailed, but content managers cannot create, edit, or delete events from Author Dashboard. | Add Events to Author Dashboard lore sub-tabs, including create/update/delete wiring to `eventsApi`. |
| `action=create` query ignored | Projects and Lore `NEW` links navigate to Author Panel but do not open the create form automatically. | Teach Author Dashboard to read `action=create` and call the matching create initializer once per navigation. |
| Weak required-field validation in Author Dashboard | Empty titles, descriptions, thumbnails, docs, and metadata can be saved. Demo data can look incomplete if presenter saves blank fields. | Add form-level validation and disabled save states per entity type. |
| Local object URLs for uploaded files | Uploaded media previews work only in the current browser memory/session and are not durable. | Replace with file upload API and durable storage URLs. |
| Client-side authorization only | Users can tamper with localStorage or frontend state. | Move role, PL, track, and ownership checks to server and keep frontend checks as UX hints. |
| Lint warnings remain | Not a demo blocker, but indicates dev tooling and hook dependency debt. | Resolve 13 ESLint warnings before production hardening. |
| Large JS bundle warning | Not a demo blocker, but affects load performance. | Add manual chunks or deeper route-level code splitting. |

## 8. Demo Script Notes

Recommended demo accounts:

| Account | Role and level | Use |
|---|---|---|
| `author@morneven.com` | author, L7 executive | Full admin, Author Dashboard, Personnel, Settings extraction. |
| `admin@morneven.com` | author, L7 executive | Alternate full admin. |
| `v.kessler@morneven.com` | personnel, L6 executive | Demonstrate L6 executive author access. |
| `m.varga@morneven.com` | personnel, L6 field | Demonstrate field-limited author access. |
| `s.okafor@morneven.com` | personnel, L6 mechanic | Demonstrate mechanic-limited author access. |
| `guest@morneven.com` or Guest Mode | guest, L0 | Demonstrate guest restrictions. |

Recommended path:

1. Start at `/`, login as author, open `/home`.
2. Show Command Center stats, news, and configured sections.
3. Browse Projects, Gallery, Lore, Events, and Maps.
4. Open Author Panel, edit a project or gallery item, and adjust Command Center settings.
5. Open Personnel, update a non-L7 personnel record.
6. Switch to a non-author personnel account, submit a Management request.
7. Return as reviewer or author, approve the request, then show notification and resulting side effect.
8. Open Chat, demonstrate DM, group invite, reply, attachment under 5 MB, unread count, and system-managed channel.

Avoid during demo unless fixed first:

- Creating or editing Lore Events from Author Dashboard.
- Expecting `NEW` links from Projects or Lore to auto-open create mode.
- Demonstrating persistence across browsers, devices, or users.
- Treating file uploads as durable storage.

## 9. Final Verdict

**Frontend demo readiness:** Ready for demo with caveats.  
**Production readiness:** Not production ready until REST API endpoints, server authorization, durable storage, and audit-grade workflow persistence are implemented.

The current frontend is strong enough for a guided demo of the main product experience. The demo must be framed as a localStorage-backed prototype, with REST integration still pending.
