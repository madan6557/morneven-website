# Production Hardening Update: Scoped Chat Reset

Date: 2026-05-17
Branch: `production-hardening`
Scope: PL7 maintenance control for resetting chat data before production launch.

## Finalized

- Added backend endpoint `POST /api/chat/reset`.
- Restricted reset access to existing PL7 maintenance authority.
- Added four selectable reset scopes:
  - `conversations`: direct message conversations.
  - `personnel_groups`: manual groups created by personnel.
  - `system_groups`: institute and division channels.
  - `team_groups`: team channels generated from team records.
- Reset deletes matching chat conversations, messages, members, invites, and read states through existing cascade relations.
- Added audit log action `chat.reset` with selected scopes and deleted counts.
- Added realtime deletion events and navigation badge refresh for affected active members.
- Extended chat maintenance status with direct conversation and personnel group counts.
- Added Settings UI controls under System Chat Reconciliation:
  - Per-scope selectable cards with current counts.
  - Critical confirmation popup before reset.
  - Reset result toast and status refresh.

## Notes

- System and team groups are generated records. After reset, `Sync Groups` can rebuild them from personnel and team data.
- Direct messages and manual personnel groups are not regenerated automatically.

## Validated

- Backend TypeScript build: pass.
- Frontend TypeScript app check: pass.

## Targeted Smoke

- Login as PL7 author or PL7 admin.
- Open `Settings`.
- Select one or more Chat Reset scopes.
- Confirm the critical popup.
- Verify selected scopes are deleted and counts update.
- Run `Sync Groups` if system or team groups should be rebuilt.
