import { apiRequest, apiUploadForm, getApiBaseUrl } from "@/services/restClient";

export type BotProvider = "openai" | "anthropic" | "gemini" | "groq" | "openrouter" | "deepseek" | "zhipu" | "vllm";
export type BotFileKind = "identity" | "memory" | "cron" | "skill" | "session" | "tool" | "user" | "system" | "other";

export interface BotCredentialSummary {
  provider: BotProvider;
  configured: boolean;
  keyPreview: string;
  metadata: Record<string, unknown>;
  updatedAt: string | null;
}

export interface OpenRouterProfile {
  id: string;
  name: string;
  configured: boolean;
  keyPreview: string;
  modelId: string;
  apiBase: string;
  tags: string[];
  notes: string;
  isActive: boolean;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotManagerPageResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BotManagerBackupJob {
  id: string;
  mode: "full" | "custom";
  status: "processing" | "completed" | "failed" | string;
  identityIds: string[];
  createdBy: string;
  createdAt: string;
  completedAt?: string | null;
  expiresAt: string;
  downloadName?: string | null;
  artifactPath?: string | null;
  artifactUrl?: string | null;
  error?: string | null;
  progress: { percent?: number; stage?: string; message?: string };
}

export interface BotIdentity {
  id: string;
  slug: string;
  name: string;
  roleTitle: string;
  description: string;
  isActive: boolean;
  isMain: boolean;
  runtimeProvider?: BotProvider | string | null;
  runtimeOpenRouterProfileId?: string | null;
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
  openRouterProfiles?: OpenRouterProfile[];
  generalConfig: Record<string, unknown>;
  identities: BotIdentity[];
  runtimeSync: {
    runtimeDirty: boolean;
    runtimeDirtySince: string | null;
    runtimeDirtyReason: string | null;
    lastRuntimeSyncAt: string | null;
    lastRuntimeSyncError: string | null;
    lastRuntimePullAt?: string | null;
    lastRuntimePullChangedCount?: number;
    lastRuntimePullConflictCount?: number;
  };
  runtimeStatus: {
    nanobotConfigured: boolean;
    singleActivePersonality: boolean;
    runtimeMode?: "single-active-personality" | "multi-active-personality" | string;
    activeIdentityId: string | null;
    activeIdentityIds?: string[];
    mainIdentityId?: string | null;
    activeProvider?: BotProvider | string | null;
    activeOpenRouterProfileId?: string | null;
  };
}

export interface BotIdentityDetail extends BotIdentity {
  files: BotIdentityFile[];
}

export interface TelegramTopicRegistryTopic {
  messageThreadId: string;
  title: string;
  lastSeenAt: string;
  source: "observed" | "manual";
}

export interface TelegramTopicRegistryGroup {
  chatId: string;
  title: string;
  isForum: boolean;
  lastSeenAt: string;
  source: "observed" | "manual";
  topics: TelegramTopicRegistryTopic[];
}

export interface TelegramTopicLockGroup {
  chatId: string;
  title: string;
  isForum: boolean;
  allowedTopicIds: string[];
  allowMainTopic: boolean;
  primaryTopicId: string;
  updatedAt: string;
}

export interface TelegramTopicLock {
  enabled: boolean;
  defaultPolicy: "allow";
  groups: TelegramTopicLockGroup[];
}

export interface TelegramTopicsResponse {
  identityId: string;
  topicLock: TelegramTopicLock;
  topicRegistry: { groups: TelegramTopicRegistryGroup[] };
  runtimeSync?: BotSummary["runtimeSync"];
  pull?: { importedCount: number; appliedPaths: string[]; skippedPaths: string[] };
}

export interface BotRuntimeStatus {
  ok?: boolean;
  action?: string;
  sync?: { synced?: boolean; reason?: string; state?: unknown };
  gateway?: {
    state?: string;
    pid?: number | null;
    uptime?: number | null;
    startedAt?: string | null;
    restart_count?: number;
    runtimes?: Array<{
      state?: string;
      identityId?: string;
      name?: string;
      slug?: string;
      isMain?: boolean;
      pid?: number | null;
      uptime?: number | null;
      startedAt?: string | null;
      restart_count?: number;
    }>;
  };
  morneven?: {
    syncedAt?: string | null;
    identity?: { name?: string; slug?: string; roleTitle?: string } | null;
    mainIdentity?: { name?: string; slug?: string; roleTitle?: string; id?: string } | null;
    runtimeCount?: number;
    runtimes?: Array<{ identityId?: string; name?: string; slug?: string; isMain?: boolean; fileCount?: number; syncedAt?: string | null }>;
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

export function activateBotProvider(provider: Exclude<BotProvider, "openrouter">, payload: {
  password: string;
  botManagerKey: string;
  confirmText: "CREDENTIALS";
}) {
  return apiRequest<{ config: Record<string, unknown>; runtimeSync: BotSummary["runtimeSync"] }>(`/bot-manager/credentials/${provider}/activate`, {
    method: "PATCH",
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

export function listOpenRouterProfiles(params: { search?: string; filter?: string; page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<BotManagerPageResponse<OpenRouterProfile>>(`/bot-manager/openrouter-profiles${suffix}`);
}

export function createOpenRouterProfile(payload: {
  name: string;
  apiKey: string;
  apiBase?: string;
  modelId: string;
  tags?: string[];
  notes?: string;
  password: string;
  botManagerKey: string;
  confirmText: "CREDENTIALS";
}) {
  return apiRequest<OpenRouterProfile>("/bot-manager/openrouter-profiles", {
    method: "POST",
    body: payload,
  });
}

export function updateOpenRouterProfile(id: string, payload: {
  name: string;
  apiKey: string;
  apiBase?: string;
  modelId: string;
  tags?: string[];
  notes?: string;
  password: string;
  botManagerKey: string;
  confirmText: "CREDENTIALS";
}) {
  return apiRequest<OpenRouterProfile>(`/bot-manager/openrouter-profiles/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function activateOpenRouterProfile(id: string, payload: {
  password: string;
  botManagerKey: string;
  confirmText: "CREDENTIALS";
}) {
  return apiRequest<{ profile: OpenRouterProfile; config: Record<string, unknown>; runtimeSync: BotSummary["runtimeSync"] }>(`/bot-manager/openrouter-profiles/${id}/activate`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteOpenRouterProfile(id: string, payload: {
  password: string;
  botManagerKey: string;
  confirmText: "CREDENTIALS";
}) {
  return apiRequest<{ deleted: boolean }>(`/bot-manager/openrouter-profiles/${id}`, {
    method: "DELETE",
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
  profileImageUrl?: string;
  channels?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  loreCharacterId?: string;
  runtimeProvider?: BotProvider | string;
  runtimeOpenRouterProfileId?: string;
}) {
  return apiRequest<BotIdentity>("/bot-manager/identities", {
    method: "POST",
    body: payload,
  });
}

export function getBotIdentity(id: string) {
  return apiRequest<BotIdentityDetail>(`/bot-manager/identities/${id}`);
}

export function updateBotIdentity(id: string, payload: Partial<Pick<BotIdentity, "name" | "roleTitle" | "description" | "profileImageUrl" | "channels" | "settings" | "runtimeProvider" | "runtimeOpenRouterProfileId">> & { loreCharacterId?: string }) {
  return apiRequest<BotIdentity>(`/bot-manager/identities/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function regenerateBotIdentityDefaultFiles(id: string, payload: {
  confirmText: "DEFAULTS";
  mode: "safe" | "force";
}) {
  return apiRequest<{
    updatedPaths: string[];
    skippedPaths: string[];
    mode: "safe" | "force";
    runtimeSync: BotSummary["runtimeSync"];
  }>(`/bot-manager/identities/${id}/default-files/regenerate`, {
    method: "POST",
    body: payload,
  });
}

export function deleteBotIdentity(id: string) {
  return apiRequest<{ deleted: boolean }>(`/bot-manager/identities/${id}`, {
    method: "DELETE",
  });
}

export function activateBotIdentity(id: string) {
  return apiRequest<BotIdentity>(`/bot-manager/identities/${id}/activate`, {
    method: "PATCH",
  });
}

export function deactivateBotIdentity(id: string) {
  return apiRequest<BotIdentity>(`/bot-manager/identities/${id}/deactivate`, {
    method: "PATCH",
  });
}

export function setMainBotIdentity(id: string) {
  return apiRequest<BotIdentity>(`/bot-manager/identities/${id}/main`, {
    method: "PATCH",
  });
}

export function getTelegramTopics(id: string) {
  return apiRequest<TelegramTopicsResponse>(`/bot-manager/identities/${id}/telegram/topics`);
}

export function updateTelegramTopicLock(id: string, topicLock: TelegramTopicLock) {
  return apiRequest<TelegramTopicsResponse>(`/bot-manager/identities/${id}/telegram/topic-lock`, {
    method: "PUT",
    body: { topicLock },
  });
}

export function addTelegramTopicManual(id: string, payload: {
  chatId: string;
  title?: string;
  isForum?: boolean;
  messageThreadId?: string;
  topicTitle?: string;
}) {
  return apiRequest<TelegramTopicsResponse>(`/bot-manager/identities/${id}/telegram/topics/manual`, {
    method: "POST",
    body: payload,
  });
}

export function refreshTelegramTopics(id: string) {
  return apiRequest<TelegramTopicsResponse>(`/bot-manager/identities/${id}/telegram/topics/refresh`, {
    method: "POST",
    timeoutMs: 30000,
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

export function deleteBotIdentityFile(id: string, path: string) {
  return apiRequest<{ deleted: boolean }>(`/bot-manager/identities/${id}/files`, {
    method: "DELETE",
    body: { path },
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
    reloadSkipped?: boolean;
    restartGateway?: boolean;
    runtimeSync?: BotSummary["runtimeSync"];
    writeback?: {
      pulledCount: number;
      appliedPaths: string[];
      conflictPaths: string[];
      skippedPaths: string[];
      changes?: unknown[];
      skipped?: Array<{ path: string; reason: string }>;
    };
    runtimeBundle?: unknown;
    nanobot?: unknown;
  }>("/bot-manager/sync", {
    method: "POST",
    timeoutMs: 60000,
  });
}

export function getBotRuntimeStatus(options: { fresh?: boolean } = {}) {
  const suffix = options.fresh ? "?fresh=true" : "";
  return apiRequest<BotRuntimeStatus>(`/bot-manager/runtime/status${suffix}`, {
    timeoutMs: 30000,
  });
}

export function listBotManagerBackups(params: { page?: number; pageSize?: number; status?: string; mode?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<BotManagerPageResponse<BotManagerBackupJob>>(`/bot-manager/backups${suffix}`);
}

export function createBotManagerBackup(payload: {
  mode: "full" | "custom";
  identityIds?: string[];
  password: string;
  secretKey: string;
  confirmText: "PERSONALITY";
}) {
  return apiRequest<BotManagerBackupJob>("/bot-manager/backups", {
    method: "POST",
    body: payload,
    timeoutMs: 30000,
  });
}

export function importBotManagerBackup(payload: {
  backupFile: File;
  password: string;
  secretKey: string;
  confirmText: "PERSONALITY";
}) {
  const form = new FormData();
  form.append("backup", payload.backupFile);
  form.append("password", payload.password);
  form.append("secretKey", payload.secretKey);
  form.append("confirmText", payload.confirmText);
  return apiUploadForm<{
    importedIdentities: number;
    createdIdentities: number;
    updatedIdentities: number;
    importedFiles: number;
    importedProfiles: number;
    generalConfigImported: boolean;
    skippedFiles: Array<{ path: string; reason: string }>;
    fileName: string;
    size: number;
    sha256: string;
  }>("/bot-manager/backups/import", form, {
    timeoutMs: 300000,
  });
}

export function getBotManagerBackup(id: string) {
  return apiRequest<BotManagerBackupJob>(`/bot-manager/backups/${id}`);
}

export function createBotManagerBackupDownloadTicket(id: string, secretKey: string) {
  return apiRequest<{ ticket: string; expiresAt: string }>(`/bot-manager/backups/${id}/download-ticket`, {
    method: "POST",
    body: { secretKey },
  });
}

export function clearBotManagerBackups(ids?: string[]) {
  return apiRequest<{ deleted: number }>("/bot-manager/backups", {
    method: "DELETE",
    body: { ids },
  });
}

export function getBotManagerBackupDownloadUrl(id: string, ticket?: string) {
  const base = `${getApiBaseUrl()}/bot-manager/backups/${id}/download`;
  return ticket ? `${base}?ticket=${encodeURIComponent(ticket)}` : base;
}

export function controlBotRuntime(action: "start" | "stop" | "restart") {
  return apiRequest<BotRuntimeStatus>(`/bot-manager/runtime/${action}`, {
    method: "POST",
    timeoutMs: 60000,
  });
}

export function controlBotRuntimeForIdentity(identityId: string, action: "start" | "stop" | "restart") {
  return apiRequest<BotRuntimeStatus>(`/bot-manager/runtime/${identityId}/${action}`, {
    method: "POST",
    timeoutMs: 60000,
  });
}

export function getBotManagerFileProxyUrl(identityId: string, objectPath: string) {
  return `${getApiBaseUrl()}/bot-manager/identities/${identityId}/files/proxy?path=${encodeURIComponent(objectPath)}`;
}
