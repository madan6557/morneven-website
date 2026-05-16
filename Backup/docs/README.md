# Documentation Index & Finalization Notes

**Last validated:** 2026-05-14 (Asia/Singapore)
**Scope:** `docs/` handover, readiness reports, and backend contracts.

## Canonical documents

1. **`CURRENT_SYSTEM_DOCUMENTATION_2026-05-14.md`**
   Current frozen system documentation for the May 14 staging QA candidate. Covers FE and BE version identity, architecture, environment variables, user guide, route matrix, role and permission rules, API surface, realtime behavior, storage, security, known risks, and operational freeze rules.

2. **`STAGING_QA_GUIDE_2026-05-14.md`**
   Current staging QA guide for the frozen May 14 candidate. Covers staging setup, freeze rules, static validation, smoke order, seed accounts, endpoint QA, browser QA, cross-flow scenarios, mutation rules, cleanup, severity rubric, pass/fail gates, and report template.

3. **`BE-REST-API-Requirement.md`**  
   Backend implementation contract (full platform) and the main source of truth for API behavior, including lore metadata, field notes, observations, image/video/file documentation attachments, management workflows, notifications, chat, and latest FE-aligned REST requirements. Refreshed on 2026-05-01 to reflect that the current BE has been developed and deploy-smoke-tested only, with functional QA still pending.

4. **`frontend-feature-validation-report-2026-05-01.md`**
   Current frontend feature inventory and demo-readiness validation, including feature descriptions, usage notes, validation rules, demo status, known gaps, and REST API readiness notes.

5. **`production-readiness-chat-plan.md`**
   Detailed production-gap analysis and phased chat hardening roadmap.

6. **`full-platform-readiness-assessment-2026-04-27.md`**
   Platform-wide readiness snapshot for demo vs production.

7. **`chat-readiness-assessment-2026-04-27.md`**
   Chat-module readiness snapshot.

8. **`functionality_test.md`**
   Functional QA run summary (tests/lint/build) used by the readiness docs.

9. **`lazy-load-content-audit-2026-05-01.md`**
   Frontend code audit for high-volume card-based content areas, especially Gallery and Lore lazy loading readiness.

10. **`security-module-proposal-2026-05-11.md`**
   Draft proposal for the Morneven Security Module, covering modular security architecture, active defense boundaries, RBAC policy hardening, audit, threat detection, file security, incident response, and phased implementation.

## Document status

- `backend-requirements-full-platform-2026-04-27.md` is retained as an **earlier baseline draft** for historical context.
- Staging QA should reference **`CURRENT_SYSTEM_DOCUMENTATION_2026-05-14.md`** and **`STAGING_QA_GUIDE_2026-05-14.md`** first.
- New backend implementation work should reference **`BE-REST-API-Requirement.md`** first, then `production-readiness-chat-plan.md` for chat-specific rollout strategy.

## Validation performed for finalization

- Verified all files in `docs/` are readable and structurally complete (no TODO placeholders).
- Aligned canonical reference flow so there is one primary backend contract plus supporting assessments.
- Fixed invalid companion-doc reference in backend contract (see update in `BE-REST-API-Requirement.md`).
- Added current Author Panel coverage for lore field notes, observations, and uploaded attachment badge/delete behavior.
- Added strict frontend variable-contract notes for REST payload parity (camelCase response fields, array defaults, and enum/date validation).
- Added current frontend feature validation report for demo readiness and REST integration gaps.
- Refreshed backend REST API requirement on 2026-05-01 against the latest FE feature inventory, including explicit deploy-only/no-QA status, FE payload parity rules, missing BE parity gaps, and per-module acceptance criteria.
- Added frontend lazy-load content audit for Gallery, Lore, Author Dashboard, and Command Center selection scalability.
- Updated backend REST API requirement with explicit lazy-load list contracts for high-volume Gallery and Lore content.

## Maintenance rule

When updating architecture or API behavior:
1. Update `BE-REST-API-Requirement.md` first.
2. Reflect impact in `production-readiness-chat-plan.md`.
3. Refresh dated readiness reports only when a new validation run is executed.
4. Add `[Updated YYYY-MM-DD]` labels to changed backend requirement sections.
