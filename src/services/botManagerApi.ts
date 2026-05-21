import { apiRequest, getApiBaseUrl } from "@/services/restClient";

export type BotProvider = "openai" | "anthropic" | "gemini" | "groq" | "openrouter" | "deepseek" | "zhipu" | "vllm";
export type BotFileKind = "identity" | "memory" | "cron" | "skill" | "session" | "tool" | "user" | "system" | "other";

export interface BotCredentialSummary {
  provider: BotProvider;
  configured: boolean;
  keyPreview: string;
  metadata: Record<string, unknown>;
  updatedAt: string | null;
}

export interface BotIdentity {
  id: string;
  slug: string;
  name: string;
  roleTitle: string;
  description: string;
  isActive: boolean;
  profileImageObjectPath?: string | null;
  profileImageUrl?: string | null;
  channels: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
}

export interface BotIdentityFile {
  id: string;
  path: string;
  kind: BotFileKind;
  contentType: string;
  objectPath: string;
  size: number;
  updatedAt: string;
  content: string;
}

export interface BotSummary {
  credentials: BotCredentialSummary[];
  generalConfig: Record<string, unknown>;
  identities: BotIdentity[];
  runtimeSync: {
    runtimeDirty: boolean;
    runtimeDirtySince: string | null;
    runtimeDirtyReason: string | null;
    lastRuntimeSyncAt: string | null;
    lastRuntimeSyncError: string | null;
  };
  runtimeStatus: {
    nanobotConfigured: boolean;
    singleActivePersonality: boolean;
    activeIdentityId: string | null;
  };
}

export interface BotIdentityDetail extends BotIdentity {
  files: BotIdentityFile[];
}

export interface BotRuntimeStatus {
  ok?: boolean;
  action?: string;
  sync?: { synced?: boolean; reason?: string; state?: unknown };
  gateway?: {
    state?: string;
    pid?: number | null;
    uptime?: number | null;
    restart_count?: number;
  };
  morneven?: {
    syncedAt?: string | null;
    identity?: { name?: string; slug?: string; roleTitle?: string } | null;
    fileCount?: number;
    mode?: string;
    error?: string;
  };
  logs?: string[];
}

export function getBotManagerSummary() {
  return apiRequest<BotSummary>("/bot-manager/summary");
}

export function updateBotCredential(payload: {
  provider: BotProvider;
  apiKey: string;
  apiBase?: string;
  modelId: string;
  password: string;
  botManagerKey: string;
  confirmText: "CREDENTIALS";
}) {
  return apiRequest<BotCredentialSummary>("/bot-manager/credentials", {
    method: "PUT",
    body: payload,
  });
}

export function unlockBotCredentials(payload: {
  password: string;
  botManagerKey: string;
  confirmText: "CREDENTIALS";
}) {
  return apiRequest<{ unlocked: boolean; unlockedAt: string }>("/bot-manager/credentials/unlock", {
    method: "POST",
    body: payload,
  });
}

export function updateBotGeneralConfig(config: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/bot-manager/general-config", {
    method: "PUT",
    body: { config },
  });
}

export function listBotIdentities() {
  return apiRequest<BotIdentity[]>("/bot-manager/identities");
}

export function createBotIdentity(payload: {
  name: string;
  roleTitle: string;
  description?: string;
  channels?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}) {
  return apiRequest<BotIdentity>("/bot-manager/identities", {
    method: "POST",
    body: payload,
  });
}

export function getBotIdentity(id: string) {
  return apiRequest<BotIdentityDetail>(`/bot-manager/identities/${id}`);
}

export function updateBotIdentity(id: string, payload: Partial<Pick<BotIdentity, "name" | "roleTitle" | "description" | "channels" | "settings">>) {
  return apiRequest<BotIdentity>(`/bot-manager/identities/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function activateBotIdentity(id: string) {
  return apiRequest<BotIdentity>(`/bot-manager/identities/${id}/activate`, {
    method: "PATCH",
  });
}

export function saveBotIdentityFile(id: string, payload: {
  path: string;
  kind: BotFileKind;
  content: string;
  contentType?: string;
}) {
  return apiRequest<BotIdentityFile>(`/bot-manager/identities/${id}/files`, {
    method: "PUT",
    body: payload,
    timeoutMs: 30000,
  });
}

export function uploadBotProfileImage(id: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<BotIdentity>(`/bot-manager/identities/${id}/profile-image`, {
    method: "POST",
    body: form,
    timeoutMs: 60000,
  });
}

export function syncBotManagerRuntime() {
  return apiRequest<{
    synced: boolean;
    reason?: string;
    runtimeSync?: BotSummary["runtimeSync"];
    bundle?: unknown;
    nanobot?: unknown;
  }>("/bot-manager/sync", {
    method: "POST",
    timeoutMs: 60000,
  });
}

export function getBotRuntimeStatus() {
  return apiRequest<BotRuntimeStatus>("/bot-manager/runtime/status", {
    timeoutMs: 30000,
  });
}

export function controlBotRuntime(action: "start" | "stop" | "restart") {
  return apiRequest<BotRuntimeStatus>(`/bot-manager/runtime/${action}`, {
    method: "POST",
    timeoutMs: 60000,
  });
}

export function getBotManagerFileProxyUrl(identityId: string, objectPath: string) {
  return `${getApiBaseUrl()}/bot-manager/identities/${identityId}/files/proxy?path=${encodeURIComponent(objectPath)}`;
}
