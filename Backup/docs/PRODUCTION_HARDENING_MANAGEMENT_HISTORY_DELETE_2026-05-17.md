# Production Hardening Update: Management Mine History Delete

Date: 2026-05-17
Branch: `production-hardening`
Scope: Final pre-production convenience fix for Management tab `Mine`.

## Finalized

- Added backend support to delete a single resolved management request owned by the signed-in requester.
- Added backend support to clear all resolved management request history owned by the signed-in requester.
- Kept pending management requests protected. Pending items cannot be deleted from history because they are active approval workflow records.
- Added audit records for single delete and bulk clear actions.
- Emitted realtime management updates after delete or clear so open clients can refresh state.
- Added frontend actions in `Management > Mine`:
  - `Delete` button on resolved request cards.
  - `Clear History` control when at least one resolved request exists.
  - Critical confirmation dialogs before deleting.
- Updated backend QA runner so QA-created management requests can be resolved and deleted when a separate requester account is available.

## Validated

- Backend TypeScript build: pass.
- Frontend TypeScript app check: pass.
- Frontend lint: pass with 13 existing accepted warnings.
- Frontend tests: pass, 3 files and 10 tests.
- Frontend production build: pass with existing bundle-size warning.
- Git whitespace check: pass for both repositories.

## Not Changed

- Pending requests remain visible and non-deletable.
- Reviewer queue behavior is unchanged.
- Historical audit logs are not deleted by this feature.

## Production Note

This changes both frontend and backend runtime code. Redeploy both production candidates before final smoke. Targeted smoke should verify:

- Create or use an approved or rejected management request in `Management > Mine`.
- Delete one resolved item and confirm it disappears after refresh.
- Clear resolved history and confirm pending requests remain.
- Confirm reviewer queue still loads and pending decision flow still works.
