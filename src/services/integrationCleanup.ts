const DEMO_STATE_KEYS = [
  "morneven_projects",
  "morneven_characters",
  "morneven_places",
  "morneven_technology",
  "morneven_gallery",
  "morneven_creatures",
  "morneven_other",
  "morneven_events",
  "morneven_news",
  "morneven_map_markers",
  "morneven_map_image",
  "morneven_personnel",
  "morneven_chat_conversations",
  "morneven_chat_messages",
  "morneven_chat_conversations_v2",
  "morneven_chat_messages_v2",
  "morneven_chat_last_read_v1",
  "morneven_mgmt_requests",
  "morneven_mgmt_teams",
  "morneven_mgmt_quotas",
  "morneven_mgmt_seeded_v1",
  "morneven_notifications",
  "morneven_cc_settings",
  "morneven_extraction_history_v1",
] as const;

export interface IntegrationCleanupResult {
  removedKeys: string[];
  skippedKeys: string[];
}

export function listDemoStateKeys(): string[] {
  return [...DEMO_STATE_KEYS];
}

export function clearDemoIntegrationState(): IntegrationCleanupResult {
  const removedKeys: string[] = [];
  const skippedKeys: string[] = [];

  if (typeof window === "undefined" || !window.localStorage) {
    return { removedKeys, skippedKeys: [...DEMO_STATE_KEYS] };
  }

  DEMO_STATE_KEYS.forEach((key) => {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        removedKeys.push(key);
      }
    } catch {
      skippedKeys.push(key);
    }
  });

  window.dispatchEvent(new CustomEvent("morneven:integration-state-cleared"));
  return { removedKeys, skippedKeys };
}
