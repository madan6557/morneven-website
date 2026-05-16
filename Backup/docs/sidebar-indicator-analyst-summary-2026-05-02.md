# Sidebar Indicator Analyst Summary

**Date:** 2026-05-02
**Scope:** Sidebar unread and pending-work indicators for Chat and Management.

## Summary

The frontend now shows contextual sidebar indicators for high-priority actionable items:

| Sidebar menu | Indicator source | Meaning |
|---|---|---|
| Chat | Chat unread message count | User has unread messages in one or more conversations. |
| Management | Reviewable pending request count | User has pending management requests they are authorized to decide. |

When the sidebar is expanded, the UI shows a small numeric badge. When collapsed, it shows a red dot.

The global notification bell remains available for inbox-style notifications, but sidebar indicators now reflect live domain state rather than notification inbox state alone.

## Frontend Implementation

Implemented local/demo helpers:

| File | New capability |
|---|---|
| `src/services/chatApi.ts` | `getChatUnreadCount`, `getConversationUnreadCount`, `readChatReadMap`, `writeChatReadMap` |
| `src/services/managementApi.ts` | `getReviewableRequestCount`, `subscribeManagement` |
| `src/components/AppSidebar.tsx` | Subscribes to chat and management changes, renders sidebar badges |
| `src/pages/ChatPage.tsx` | Uses shared chat read-map helpers so sidebar updates when conversations are marked read |

## Current Demo Behavior

Chat:

- Counts unread non-system messages authored by other users.
- Uses `morneven_chat_last_read_v1` to compare per-conversation last-read timestamps.
- Updates when chat storage changes or when conversations are marked read.

Management:

- Counts pending requests where `canDecideRequest` returns `true`.
- Excludes self-submitted requests.
- Respects personnel level and track authorization rules.
- Updates when management request storage changes.

## Backend Requirement

For production, the frontend should not derive sidebar counts by loading full collections. Add an aggregate endpoint:

```txt
GET /v1/me/navigation-badges
```

Recommended response:

```json
{
  "chatUnreadCount": 4,
  "managementPendingCount": 2,
  "notificationUnreadCount": 7
}
```

Alternative split endpoints:

```txt
GET /v1/chat/unread-count
GET /v1/management/requests/pending-count
GET /v1/notifications/unread-count
```

Recommended approach is the aggregate endpoint because the sidebar is global and appears across most authenticated screens.

## Real-Time Update Requirement

Production should push badge updates through one of:

- WebSocket event: `navigation_badges.updated`
- Server-sent event stream
- Polling fallback at a low frequency, such as 30 to 60 seconds

Expected payload:

```json
{
  "chatUnreadCount": 5,
  "managementPendingCount": 1,
  "notificationUnreadCount": 8
}
```

## Analyst Notes

Notification inbox state is not sufficient for sidebar indicators:

- A user can mark notifications as read while still having pending management requests.
- A notification can be cleared while the underlying request remains actionable.
- Chat unread state is conversation-specific and should remain separate from notification read state.

The system should treat sidebar indicators as domain-derived operational state, not as a duplicate notification counter.
