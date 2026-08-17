import { type CSSProperties, type ChangeEvent, type ReactNode, type UIEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Navigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BarChart3,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Hash,
  Info,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  Play,
  Plus,
  Power,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Shield,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";


import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import TagInput from "@/components/TagInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { canAccessBotManager } from "@/lib/pl";
import { cn } from "@/lib/utils";
import {
  activateBotIdentity,
  activateProviderAccount,
  activateBotProvider,
  activateOpenRouterProfile,
  addTelegramTopicManual,
  clearBotManagerBackups,
  controlBotRuntime,
  controlBotRuntimeForIdentity,
  createBotManagerBackup,
  createBotIdentity,
  createProviderAccount,
  createOpenRouterProfile,
  createBotManagerBackupDownloadTicket,
  deleteBotIdentity,
  deleteBotIdentityFile,
  deleteBotRuntimeFreeze,
  deleteBotRuntimeSchedule,
  deactivateBotIdentity,
  deleteOpenRouterProfile,
  deleteProviderAccount,
  getBotManagerBackupDownloadUrl,
  getBotManagerFileProxyUrl,
  getBotIdentity,
  getBotManagerSummary,
  getBotRuntimeStatus,
  getBotRuntimeFreeze,
  getBotRuntimeSchedule,
  getProviderAnalytics,
  getTelegramTopics,
  importBotManagerBackup,
  listBotManagerBackups,
  listOpenRouterProfiles,
  refreshTelegramTopics,
  regenerateBotIdentityDefaultFiles,
  saveBotIdentityFile,
  setMainBotIdentity,
  syncBotManagerRuntime,
  unlockBotCredentials,
  updateBotCredential,
  updateBotGeneralConfig,
  updateBotIdentity,
  updateBotRuntimeFreeze,
  updateBotRuntimeSchedule,
  updateOpenRouterProfile,
  updateProviderAccount,
  updateProviderAnalyticsCredential,
  updateTelegramTopicLock,
  type BotManagerBackupJob,
  uploadBotProfileImage,
  type BotFileKind,
  type BotIdentity,
  type BotIdentityDetail,
  type BotChatAccess,
  type BotChatAccessMode,
  type BotIdentityFile,
  type BotProvider,
  type BotProviderAccount,
  type BotProviderAnalytics,
  type BotRuntimeStatus,
  type BotRuntimeFreeze,
  type BotRuntimeSchedule,
  type BotSummary,
  type OpenRouterProfile,
  type TelegramTopicLock,
  type TelegramTopicsResponse,
} from "@/services/botManagerApi";
import {
  createDefaultScheduleInput,
  scheduleInputFromTask,
  type ScheduleInput,
} from "@/services/schedulerTypes";
import { getCharactersPage } from "@/services/loreApi";
import { ApiError } from "@/services/restClient";
import type { Character } from "@/types";

const providers: Array<{ value: BotProvider; label: string }> = [
  { value: "gemini", label: "Gemini" },
  { value: "anthropic", label: "Anthropic" },
  { value: "groq", label: "Groq" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "opencode", label: "OpenCode" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "zhipu", label: "Zhipu" },
  { value: "vllm", label: "vLLM" },
];
const normalProviders = providers.filter((provider) => provider.value !== "openrouter") as Array<{ value: Exclude<BotProvider, "openrouter">; label: string }>;
const providerValues = new Set(providers.map((provider) => provider.value));
const isBotProvider = (value: unknown): value is BotProvider =>
  typeof value === "string" && providerValues.has(value as BotProvider);

const fileKinds: BotFileKind[] = ["identity", "memory", "cron", "skill", "session", "tool", "user", "system", "other"];
const tabs = ["channels", "system", "files", "memory", "cron", "sessions", "settings", "logs"] as const;
type BotTab = (typeof tabs)[number];
type ChannelKey = "telegram" | "whatsapp" | "discord" | "slack" | "feishu" | "dingtalk";
type JsonRecord = Record<string, unknown>;
type BotSecretRef = {
  __botManagerSecret: true;
  configured: boolean;
  preview: string;
};
type SecretFieldValue = string | BotSecretRef;

const channelTabs: Array<{ key: ChannelKey; label: string; detail: string; icon: typeof MessageCircle }> = [
  { key: "telegram", label: "Telegram", detail: "BotFather token", icon: Send },
  { key: "whatsapp", label: "WhatsApp", detail: "Local bridge", icon: Phone },
  { key: "discord", label: "Discord", detail: "Bot token", icon: Hash },
  { key: "slack", label: "Slack", detail: "App token", icon: MessageCircle },
  { key: "feishu", label: "Feishu", detail: "Lark app", icon: MessageCircle },
  { key: "dingtalk", label: "DingTalk", detail: "Robot webhook", icon: MessageCircle },
];

const defaultChatAccess: BotChatAccess = {
  mode: "disabled",
  allowedConversationIds: [],
  allowBotToBot: false,
  maxTurns: 2,
  maxTokensPerRun: 1200,
};

function normalizeChatAccess(value?: Partial<BotChatAccess> | null): BotChatAccess {
  return {
    ...defaultChatAccess,
    ...(value ?? {}),
    allowedConversationIds: [...(value?.allowedConversationIds ?? [])],
  };
}

type BotIdentityDraft = {
  name: string;
  roleTitle: string;
  description: string;
  runtimeProvider: string;
  runtimeProviderAccountId: string;
  runtimeOpenRouterProfileId: string;
  chatAccess: BotChatAccess;
};

type BotSettingsDraft = {
  maxTokens: string;
  temperature: string;
  maxToolIterations: string;
  autoDreamEnabled: boolean;
  autoDreamIntervalHours: string;
  autoDreamModelOverride: string;
  autoDreamMaxBatchSize: string;
  autoDreamMaxIterations: string;
  autoDreamAnnotateLineAges: boolean;
  webSearchApiKey: SecretFieldValue;
  webSearchMaxResults: string;
  execTimeout: string;
  restrictToWorkspace: boolean;
  restartAfterSync: boolean;
};

type GeneralConfigDraft = {
  runtimeMode: "single-active-personality" | "multi-active-personality";
  timezone: string;
  generalInformation: string;
  globalRules: string;
  restartAfterSync: boolean;
  allowRuntimeReload: boolean;
};

type OpenRouterDraft = {
  id?: string;
  name: string;
  apiKey: string;
  keyPreview?: string;
  apiBase: string;
  modelId: string;
  tags: string[];
  notes: string;
};

type ProviderAccountDraft = {
  id?: string;
  provider: BotProvider;
  name: string;
  apiKey: string;
  keyPreview?: string;
  apiBase: string;
  modelId: string;
  tags: string[];
  notes: string;
};

type ProviderCredentialDraft = {
  apiKey: string;
  apiBase: string;
  modelId: string;
  analyticsApiKey: string;
  analyticsOrganizationId: string;
  analyticsProjectId: string;
  analyticsApiKeyId: string;
  analyticsBillingAccountId: string;
};

type ZeroClawAuditIdentity = {
  identityId: string;
  slug: string;
  name: string;
  isMain: boolean;
  audit: {
    canonicalFileCount: number;
    workspaceFileCount: number;
    cronJobCount: number;
    cronSkippedCount: number;
    memoryReferenceCount: number;
  };
};

type ZeroClawAudit = {
  translationVersion: number | null;
  identityCount: number;
  identities: ZeroClawAuditIdentity[];
};

const defaultModelIds: Partial<Record<BotProvider, string>> = {
  gemini: "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-5",
  groq: "llama-3.1-8b-instant",
  openai: "gpt-4.1-mini",
  opencode: "mimo-v2.5-free",
  deepseek: "deepseek-chat",
  zhipu: "glm-4.5",
  vllm: "local-model",
};

const analyticsKeyProviders = new Set<BotProvider>(["openai", "anthropic"]);

function createProviderCredentialDraft(provider: BotProvider, metadata: JsonRecord = {}, analyticsMetadata: JsonRecord = {}): ProviderCredentialDraft {
  return {
    apiKey: "",
    apiBase: "",
    modelId: readString(metadata.modelId, defaultModelIds[provider] ?? ""),
    analyticsApiKey: "",
    analyticsOrganizationId: readString(analyticsMetadata.organizationId),
    analyticsProjectId: readString(analyticsMetadata.projectId),
    analyticsApiKeyId: readString(analyticsMetadata.apiKeyId),
    analyticsBillingAccountId: readString(analyticsMetadata.billingAccountId),
  };
}

const inputClass =
  "min-w-0 w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:ring-1 focus:ring-primary";
const textareaClass = `${inputClass} min-h-40 resize-y font-mono text-xs leading-5`;
const panelClass = "hud-border bg-card p-4 sm:p-5";
const RUNTIME_STATUS_POLL_MS = 60_000;
const BACKUP_ACTIVE_POLL_MS = 3_000;

function toJsonText(value: unknown) {
  return JSON.stringify(redactSensitiveForDisplay(value ?? {}), null, 2);
}

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function usePageVisibility() {
  const [visible, setVisible] = useState(isDocumentVisible);

  useEffect(() => {
    const handleVisibilityChange = () => setVisible(isDocumentVisible());
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return visible;
}

function isRecordValue(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecordValue(value) ? value : {};
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function extractZeroClawAudit(value: unknown): ZeroClawAudit | null {
  const bundle = asRecord(asRecord(value).runtimeBundle);
  const zeroClaw = asRecord(bundle.zeroclaw);
  const identities = Array.isArray(zeroClaw.identities)
    ? zeroClaw.identities.map((entry) => {
      const record = asRecord(entry);
      const audit = asRecord(record.audit);
      return {
        identityId: readString(record.identityId),
        slug: readString(record.slug),
        name: readString(record.name),
        isMain: readBoolean(record.isMain, false),
        audit: {
          canonicalFileCount: readNumber(audit.canonicalFileCount),
          workspaceFileCount: readNumber(audit.workspaceFileCount),
          cronJobCount: readNumber(audit.cronJobCount),
          cronSkippedCount: readNumber(audit.cronSkippedCount),
          memoryReferenceCount: readNumber(audit.memoryReferenceCount),
        },
      };
    }).filter((entry) => entry.identityId || entry.slug || entry.name)
    : [];
  if (!identities.length && typeof zeroClaw.translationVersion !== "number") return null;
  return {
    translationVersion: typeof zeroClaw.translationVersion === "number" ? zeroClaw.translationVersion : null,
    identityCount: readNumber(zeroClaw.identityCount, identities.length),
    identities,
  };
}

function readNumberText(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : readString(value, String(fallback));
}

function formatCount(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat().format(number);
}

function formatAxisCount(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(number);
}

function formatChartDate(value: unknown) {
  return typeof value === "string" && value.length >= 10 ? value.slice(5, 10) : String(value ?? "");
}

function formatMoney(value: unknown, currency = "USD") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 4 }).format(value);
}

function formatSignedMoney(value: unknown, currency = "USD") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(value), currency)}`;
}

function creditBalanceMetricParts(analytics: BotProviderAnalytics | null) {
  const currency = analytics?.currency ?? "USD";
  const base = formatMoney(analytics?.creditBalance, currency);
  const parts: Array<{ value: string; kind: "down" | "up" }> = [];
  if (!analytics || typeof analytics.creditBalance !== "number" || !Number.isFinite(analytics.creditBalance)) return { base, parts };
  if (typeof analytics.currentSpend === "number" && Number.isFinite(analytics.currentSpend) && analytics.currentSpend > 0) {
    parts.push({ value: `-${formatMoney(analytics.currentSpend, currency)}`, kind: "down" });
  }
  const topUpAmount = typeof analytics.topUpAmount === "number" && Number.isFinite(analytics.topUpAmount)
    ? analytics.topUpAmount
    : null;
  if (typeof topUpAmount === "number" && topUpAmount > 0 && (parts.length > 0 || topUpAmount !== analytics.creditBalance)) {
    parts.push({ value: formatSignedMoney(topUpAmount, currency), kind: "up" });
  }
  return { base, parts };
}

function creditBalanceInfo(analytics: BotProviderAnalytics | null) {
  if (!analytics) return "Balance and spend are loaded after provider analytics refresh.";
  const spendSource = typeof analytics.currentSpend === "number" && Number.isFinite(analytics.currentSpend)
    ? analytics.monthlySpend === analytics.currentSpend && analytics.source === "provider_api" ? "provider API" : "local usage events"
    : "not available";
  return `Spend follows the selected range and uses ${spendSource} when provider spend data is unavailable. Local estimates depend on recorded runtime token usage and known provider pricing, so they may differ from the provider billing page.`;
}

function readBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return typeof value === "boolean" ? value : fallback;
}

function readSecretRef(value: unknown): BotSecretRef | null {
  if (!isRecordValue(value) || value.__botManagerSecret !== true) return null;
  return {
    __botManagerSecret: true,
    configured: value.configured !== false,
    preview: readString(value.preview),
  };
}

function readSecretDraft(value: unknown): SecretFieldValue {
  return readSecretRef(value) ?? readString(value);
}

const sensitiveSecretKeys = new Set(["token", "apikey", "bottoken", "apptoken", "signingsecret", "appsecret", "verificationtoken", "encryptkey", "secret", "webhookurl"]);

function redactSensitiveForDisplay(value: unknown, key?: string): unknown {
  const normalizedKey = key?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (normalizedKey && sensitiveSecretKeys.has(normalizedKey)) {
    return "[redacted]";
  }
  const secret = readSecretRef(value);
  if (secret) return secret.configured ? `Configured: ${secret.preview || "***"}` : "empty";
  if (key === "bundle") return "[omitted]";
  if (Array.isArray(value)) return value.map((item) => redactSensitiveForDisplay(item));
  if (!isRecordValue(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactSensitiveForDisplay(entryValue, entryKey)]));
}

function readStringArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  return readString(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function isLikelyEmailAutofill(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function characterTraits(character: Character) {
  return Array.isArray(character.traits) ? character.traits.map((trait) => trait.trim()).filter(Boolean) : [];
}

function formatCharacterLabel(character: Character) {
  const traits = characterTraits(character);
  const detail = traits.length ? traits.join(", ") : character.occupation ?? character.race ?? "Lore";
  return `${character.name} - ${detail}`;
}

function matchesCharacterNameOrTrait(character: Character, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [character.name, ...characterTraits(character)].some((value) => value.toLowerCase().includes(query));
}

function characterSearchRank(character: Character, search: string) {
  const query = search.trim().toLowerCase();
  const name = character.name.toLowerCase();
  const traits = characterTraits(character).map((trait) => trait.toLowerCase());
  if (!query) return 0;
  if (name === query) return 0;
  if (traits.some((trait) => trait === query)) return 1;
  if (name.startsWith(query)) return 2;
  if (traits.some((trait) => trait.startsWith(query))) return 3;
  if (name.includes(query)) return 4;
  if (traits.some((trait) => trait.includes(query))) return 5;
  return 6;
}

function prioritizeCharacterOptions(items: Character[], search: string) {
  return items.filter((item) => matchesCharacterNameOrTrait(item, search)).sort((left, right) => {
    const rank = characterSearchRank(left, search) - characterSearchRank(right, search);
    return rank || left.name.localeCompare(right.name);
  });
}

function createCharacterAutofill(character: Character) {
  return {
    name: character.name,
    role: character.occupation || character.race || "Morneven character",
    description: character.shortDesc || "",
  };
}

function characterProfileImage(character?: Character | null) {
  return character?.profileImage || character?.thumbnail || "";
}

function createGeneralConfigDraft(value: unknown): GeneralConfigDraft {
  const config = asRecord(value);
  const gateway = asRecord(config.gateway);
  const runtimeMode: GeneralConfigDraft["runtimeMode"] = readString(config.runtimeMode, "single-active-personality") === "multi-active-personality"
    ? "multi-active-personality"
    : "single-active-personality";
  return {
    runtimeMode,
    timezone: readString(config.timezone, "Asia/Singapore"),
    generalInformation: readString(config.generalInformation),
    globalRules: readString(config.globalRules, "Follow Morneven website policy and active personality files."),
    restartAfterSync: readBoolean(gateway.restartAfterSync, false),
    allowRuntimeReload: readBoolean(gateway.allowRuntimeReload, true),
  };
}

function generalConfigDraftToConfig(base: JsonRecord, draft: GeneralConfigDraft): JsonRecord {
  return mergeRecord(base, {
    runtimeMode: draft.runtimeMode,
    timezone: draft.timezone,
    generalInformation: draft.generalInformation,
    globalRules: draft.globalRules,
    gateway: {
      restartAfterSync: draft.restartAfterSync,
      allowRuntimeReload: draft.allowRuntimeReload,
    },
  });
}

const generalConfigDraftStorageKey = "morneven.botManager.generalConfigDraft.v1";

function sameGeneralConfigDraft(left: GeneralConfigDraft, right: GeneralConfigDraft) {
  return (
    left.timezone === right.timezone &&
    left.runtimeMode === right.runtimeMode &&
    left.generalInformation === right.generalInformation &&
    left.globalRules === right.globalRules &&
    left.restartAfterSync === right.restartAfterSync &&
    left.allowRuntimeReload === right.allowRuntimeReload
  );
}

function readStoredGeneralConfigDraft(): GeneralConfigDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(generalConfigDraftStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { draft?: unknown };
    const draft = asRecord(parsed.draft ?? parsed);
    if ("timezone" in draft || "generalInformation" in draft || "globalRules" in draft || "runtimeMode" in draft || "restartAfterSync" in draft || "allowRuntimeReload" in draft) {
      const runtimeMode: GeneralConfigDraft["runtimeMode"] = readString(draft.runtimeMode, "single-active-personality") === "multi-active-personality"
        ? "multi-active-personality"
        : "single-active-personality";
      return {
        runtimeMode,
        timezone: readString(draft.timezone, "Asia/Singapore"),
        generalInformation: readString(draft.generalInformation),
        globalRules: readString(draft.globalRules, "Follow Morneven website policy and active personality files."),
        restartAfterSync: readBoolean(draft.restartAfterSync, false),
        allowRuntimeReload: readBoolean(draft.allowRuntimeReload, true),
      };
    }
    return createGeneralConfigDraft(draft);
  } catch {
    return null;
  }
}

function writeStoredGeneralConfigDraft(draft: GeneralConfigDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(generalConfigDraftStorageKey, JSON.stringify({ draft, updatedAt: new Date().toISOString() }));
}

function clearStoredGeneralConfigDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(generalConfigDraftStorageKey);
}

function numberFromText(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatUptime(seconds?: number | null) {
  if (!seconds) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 1) return `${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 1) return `${minutes}m ${remainingSeconds}s`;
  return `${hours}h ${remainingMinutes}m`;
}

function isActiveBackupJob(job: Pick<BotManagerBackupJob, "status">) {
  return ["queued", "processing", "running"].includes(job.status);
}

function mergeRecord(base: JsonRecord, patch: JsonRecord): JsonRecord {
  const result: JsonRecord = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    result[key] = isRecordValue(existing) && isRecordValue(value) ? mergeRecord(existing, value) : value;
  }
  return result;
}

function createDefaultChannels(): JsonRecord {
  return {
    telegram: { enabled: false, token: "", allowFrom: ["*"], proxy: "" },
    whatsapp: { enabled: false, bridgeUrl: "ws://localhost:3001", allowFrom: [] },
    discord: { enabled: false, token: "", applicationId: "", guildIds: [], channelIds: [] },
    slack: { enabled: false, botToken: "", appToken: "", signingSecret: "", channelIds: [] },
    feishu: { enabled: false, appId: "", appSecret: "", verificationToken: "", encryptKey: "" },
    dingtalk: { enabled: false, webhookUrl: "", secret: "", allowFrom: [] },
  };
}

function normalizeChannels(value: unknown) {
  return mergeRecord(createDefaultChannels(), asRecord(value));
}

function createSettingsDraft(value: unknown): BotSettingsDraft {
  const settings = asRecord(value);
  const agents = asRecord(settings.agents);
  const defaults = asRecord(agents.defaults);
  const dream = asRecord(defaults.dream);
  const autoDream = asRecord(settings.autoDream);
  const tools = asRecord(settings.tools);
  const web = asRecord(tools.web);
  const search = asRecord(web.search);
  const exec = asRecord(tools.exec);
  const gateway = asRecord(settings.gateway);

  return {
    maxTokens: readNumberText(defaults.maxTokens, 8192),
    temperature: readNumberText(defaults.temperature, 0.7),
    maxToolIterations: readNumberText(defaults.maxToolIterations, 20),
    autoDreamEnabled: readBoolean(autoDream.enabled, true),
    autoDreamIntervalHours: readNumberText(dream.intervalH ?? dream.interval_h, 2),
    autoDreamModelOverride: readString(dream.modelOverride ?? dream.model_override),
    autoDreamMaxBatchSize: readNumberText(dream.maxBatchSize ?? dream.max_batch_size, 20),
    autoDreamMaxIterations: readNumberText(dream.maxIterations ?? dream.max_iterations, 15),
    autoDreamAnnotateLineAges: readBoolean(dream.annotateLineAges ?? dream.annotate_line_ages, true),
    webSearchApiKey: readSecretDraft(search.apiKey),
    webSearchMaxResults: readNumberText(search.maxResults, 5),
    execTimeout: readNumberText(exec.timeout, 60),
    restrictToWorkspace: readBoolean(exec.restrictToWorkspace, false),
    restartAfterSync: readBoolean(gateway.restartAfterSync, false),
  };
}

function settingsDraftToConfig(draft: BotSettingsDraft): JsonRecord {
  return {
    agents: {
      defaults: {
        maxTokens: numberFromText(draft.maxTokens, 8192),
        temperature: numberFromText(draft.temperature, 0.7),
        maxToolIterations: numberFromText(draft.maxToolIterations, 20),
        dream: {
          intervalH: Math.max(1, numberFromText(draft.autoDreamIntervalHours, 2)),
          modelOverride: draft.autoDreamModelOverride.trim() || null,
          maxBatchSize: Math.max(1, numberFromText(draft.autoDreamMaxBatchSize, 20)),
          maxIterations: Math.max(1, numberFromText(draft.autoDreamMaxIterations, 15)),
          annotateLineAges: draft.autoDreamAnnotateLineAges,
        },
      },
    },
    autoDream: {
      enabled: draft.autoDreamEnabled,
    },
    tools: {
      web: {
        search: {
          apiKey: draft.webSearchApiKey,
          maxResults: numberFromText(draft.webSearchMaxResults, 5),
        },
      },
      exec: {
        timeout: numberFromText(draft.execTimeout, 60),
        restrictToWorkspace: draft.restrictToWorkspace,
      },
    },
    gateway: {
      restartAfterSync: draft.restartAfterSync,
    },
  };
}

function emptyFile(): BotIdentityFile {
  return {
    id: "new",
    path: "SOUL.md",
    kind: "identity",
    contentType: "text/markdown",
    objectPath: "",
    size: 0,
    updatedAt: new Date().toISOString(),
    content: "",
  };
}

function normalizeFilePath(value: string) {
  return value.trim().replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
}

function isMemoryFile(file: Pick<BotIdentityFile, "kind" | "path">) {
  const path = normalizeFilePath(file.path);
  return file.kind === "memory" || path === "memory.md" || path.startsWith("memory/");
}

function isCronFile(file: Pick<BotIdentityFile, "kind" | "path">) {
  return file.kind === "cron" || normalizeFilePath(file.path).startsWith("cron/");
}

function isSessionFile(file: Pick<BotIdentityFile, "kind" | "path">) {
  return file.kind === "session" || normalizeFilePath(file.path).startsWith("sessions/");
}

function isReadOnlyFilePath(path: string) {
  const normalized = normalizeFilePath(path);
  return normalized === "memory/history.jsonl" || normalized === "lore.md";
}

function isProtectedFilePath(path: string) {
  return ["agents.md", "soul.md", "memory.md", "tools.md", "user.md", "heartbeat.md", "lore.md", "memory/history.jsonl"].includes(normalizeFilePath(path));
}

function getFileUsageNote(file: Pick<BotIdentityFile, "kind" | "path">) {
  const path = normalizeFilePath(file.path);
  if (path === "agents.md") return "Core instruction file. Edit only when changing identity-level operating rules.";
  if (path === "soul.md") return "Primary personality file. Use it for tone, identity, boundaries, and behavior.";
  if (path === "memory.md") return "Editable long-term memory summary for this personality.";
  if (path === "tools.md") return "Editable notes for allowed tools and tool usage rules.";
  if (path === "user.md") return "Editable user preference and audience profile notes.";
  if (path === "heartbeat.md") return "Editable periodic task and heartbeat notes.";
  if (path === "lore.md") return "Lore reference generated from Morneven Lore/Wiki. Read-only and protected from delete.";
  if (path === "memory/history.jsonl") return "Runtime history ledger. Read-only in Bot Manager; do not edit manually.";
  if (file.kind === "memory") return "Editable per-personality memory file. Prefer memory/*.md for manual notes.";
  if (file.kind === "cron" || path.startsWith("cron/")) return "Editable scheduled task configuration or notes for this personality.";
  if (file.kind === "session" || path.startsWith("sessions/")) return "Editable session configuration or notes for this personality.";
  return "Editable workspace file. Use a scoped path and sync runtime after saving.";
}

export default function BotManagerPage() {
  const { isAuthenticated, role, personnelLevel } = useAuth();
  const { toast } = useToast();
  const pageVisible = usePageVisibility();
  const allowed = canAccessBotManager(personnelLevel, role);
  const [summary, setSummary] = useState<BotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BotIdentityDetail | null>(null);
  const [activeTab, setActiveTab] = useState<BotTab>("channels");
  const [generalBase, setGeneralBase] = useState<JsonRecord>({});
  const [generalDraft, setGeneralDraft] = useState<GeneralConfigDraft>(() => readStoredGeneralConfigDraft() ?? createGeneralConfigDraft({}));
  const [generalDraftDirty, setGeneralDraftDirty] = useState(() => Boolean(readStoredGeneralConfigDraft()));
  const generalDraftDirtyRef = useRef(generalDraftDirty);
  const [syncLog, setSyncLog] = useState("");
  const [zeroClawAudit, setZeroClawAudit] = useState<ZeroClawAudit | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<BotRuntimeStatus | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    credentials: false,
    general: false,
    personalities: false,
    backup: false,
  });
  type MainTab = "runtime" | "providers" | "personalities" | "config" | "backups";
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("runtime");

  const [providerDrafts, setProviderDrafts] = useState<Partial<Record<BotProvider, ProviderCredentialDraft>>>({});
  const [selectedAnalyticsProvider, setSelectedAnalyticsProvider] = useState<BotProvider>("deepseek");
  useEffect(() => {
    const runtimeProvider = summary?.runtimeStatus.activeProvider;
    if (isBotProvider(runtimeProvider)) setSelectedAnalyticsProvider(runtimeProvider);
  }, [summary?.runtimeStatus.activeProvider]);
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d">("7d");
  const [providerAnalytics, setProviderAnalytics] = useState<BotProviderAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [credentialPassword, setCredentialPassword] = useState("");
  const [credentialKey, setCredentialKey] = useState("");
  const [credentialConfirm, setCredentialConfirm] = useState("");
  const [credentialUnlocked, setCredentialUnlocked] = useState(false);
  const [providerAccounts, setProviderAccounts] = useState<BotProviderAccount[]>([]);
  const [providerAccountProvider, setProviderAccountProvider] = useState<BotProvider>("openai");
  const [providerAccountSearch, setProviderAccountSearch] = useState("");
  const [providerAccountFilter, setProviderAccountFilter] = useState("all");
  const [providerAccountDraft, setProviderAccountDraft] = useState<ProviderAccountDraft>({ provider: "openai", name: "", apiKey: "", apiBase: "", modelId: defaultModelIds.openai ?? "", tags: [], notes: "" });
  const [openRouterProfiles, setOpenRouterProfiles] = useState<OpenRouterProfile[]>([]);
  const [openRouterSearch, setOpenRouterSearch] = useState("");
  const [openRouterFilter, setOpenRouterFilter] = useState("all");
  const [openRouterPage, setOpenRouterPage] = useState(1);
  const [openRouterTotalPages, setOpenRouterTotalPages] = useState(1);
  const [openRouterDraft, setOpenRouterDraft] = useState<OpenRouterDraft>({ name: "", apiKey: "", apiBase: "", modelId: "", tags: [], notes: "" });

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showCreatePersonality, setShowCreatePersonality] = useState(false);
  const [createLoreSearch, setCreateLoreSearch] = useState("");
  const [createLoreOptions, setCreateLoreOptions] = useState<Character[]>([]);
  const [selectedCreateLore, setSelectedCreateLore] = useState<Character | null>(null);
  const [createAutofill, setCreateAutofill] = useState<ReturnType<typeof createCharacterAutofill> | null>(null);
  const [editingIdentityId, setEditingIdentityId] = useState<string | null>(null);
  const [personalitySearch, setPersonalitySearch] = useState("");
  const personalitySearchRef = useRef<HTMLInputElement | null>(null);
  const initialRuntimeSyncRef = useRef(false);
  const [personalityFilter, setPersonalityFilter] = useState("all");
  const [personalityPage, setPersonalityPage] = useState(1);
  const [loreSearch, setLoreSearch] = useState("");
  const [loreOptions, setLoreOptions] = useState<Character[]>([]);
  const [selectedLoreId, setSelectedLoreId] = useState("");
  const [defaultRegenerateMode, setDefaultRegenerateMode] = useState<"safe" | "force">("safe");
  const [defaultRegenerateConfirm, setDefaultRegenerateConfirm] = useState("");
  const [identityDraft, setIdentityDraft] = useState<BotIdentityDraft>({ name: "", roleTitle: "", description: "", runtimeProvider: "", runtimeProviderAccountId: "", runtimeOpenRouterProfileId: "", chatAccess: normalizeChatAccess() });
  const [channelsDraft, setChannelsDraft] = useState<JsonRecord>(createDefaultChannels());
  const channelsDraftRef = useRef<JsonRecord>(channelsDraft);
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>("telegram");
  const [settingsBase, setSettingsBase] = useState<JsonRecord>({});
  const settingsBaseRef = useRef<JsonRecord>(settingsBase);
  const [settingsDraft, setSettingsDraft] = useState<BotSettingsDraft>(() => createSettingsDraft({}));
  const settingsDraftRef = useRef<BotSettingsDraft>(settingsDraft);
  const [fileDraft, setFileDraft] = useState<BotIdentityFile>(emptyFile());
  const [backupMode, setBackupMode] = useState<"full" | "custom">("full");
  const [backupSelectedIds, setBackupSelectedIds] = useState<string[]>([]);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupKey, setBackupKey] = useState("");
  const [backupConfirm, setBackupConfirm] = useState("");
  const [backupImportFile, setBackupImportFile] = useState<File | null>(null);
  const [backupImportPassword, setBackupImportPassword] = useState("");
  const [backupImportKey, setBackupImportKey] = useState("");
  const [backupImportConfirm, setBackupImportConfirm] = useState("");
  const [backupJobs, setBackupJobs] = useState<BotManagerBackupJob[]>([]);
  const [backupPage, setBackupPage] = useState(1);
  const [backupTotalPages, setBackupTotalPages] = useState(1);
  const [backupStatus, setBackupStatus] = useState("all");
  const [backupHistoryMode, setBackupHistoryMode] = useState("all");
  const [runtimeNow, setRuntimeNow] = useState(() => Date.now());

  const activeIdentity = useMemo(
    () => summary?.identities.find((identity) => identity.isMain) ?? summary?.identities.find((identity) => identity.isActive) ?? null,
    [summary],
  );
  const backupVisible = allowed && pageVisible && !collapsedSections.backup;
  const credentialsVisible = allowed && pageVisible && !collapsedSections.credentials;
  const personalitiesVisible = allowed && pageVisible && !collapsedSections.personalities;
  const hasActiveBackupJob = useMemo(() => backupJobs.some(isActiveBackupJob), [backupJobs]);
  const observedGatewayState = runtimeStatus?.gateway?.state ?? null;

  useEffect(() => {
    generalDraftDirtyRef.current = generalDraftDirty;
  }, [generalDraftDirty]);

  const updateGeneralDraft = useCallback((patch: Partial<GeneralConfigDraft>) => {
    setGeneralDraft((current) => {
      const next = { ...current, ...patch };
      writeStoredGeneralConfigDraft(next);
      return next;
    });
    setGeneralDraftDirty(true);
  }, []);

  const resetGeneralDraft = useCallback(() => {
    clearStoredGeneralConfigDraft();
    const savedDraft = createGeneralConfigDraft(generalBase);
    setGeneralDraft(savedDraft);
    setGeneralDraftDirty(false);
  }, [generalBase]);

  const canUnlockCredential =
    credentialPassword.length > 0 &&
    credentialKey.trim().length >= 16 &&
    credentialConfirm === "CREDENTIALS";

  const credentialForProvider = (provider: BotProvider) => summary?.credentials.find((item) => item.provider === provider);
  const analyticsCredentialForProvider = (provider: BotProvider) => summary?.analyticsCredentials?.find((item) => item.provider === provider);
  const draftForProvider = (provider: BotProvider) => {
    const credential = credentialForProvider(provider);
    const analyticsCredential = analyticsCredentialForProvider(provider);
    return providerDrafts[provider] ?? createProviderCredentialDraft(provider, asRecord(credential?.metadata), asRecord(analyticsCredential?.metadata));
  };
  const updateProviderDraft = (provider: BotProvider, patch: Partial<ProviderCredentialDraft>) => {
    setProviderDrafts((current) => ({
      ...current,
      [provider]: {
        ...draftForProvider(provider),
        ...patch,
      },
    }));
  };
  const canSubmitCredential = (provider: BotProvider) => {
    const draft = draftForProvider(provider);
    const configured = Boolean(credentialForProvider(provider)?.configured);
    return credentialUnlocked && (draft.apiKey.trim().length > 0 || configured) && draft.modelId.trim().length > 0 && canUnlockCredential;
  };
  const canSubmitAnalyticsCredential = (provider: BotProvider) => {
    const draft = draftForProvider(provider);
    const configured = Boolean(analyticsCredentialForProvider(provider)?.configured);
    return credentialUnlocked && (draft.analyticsApiKey.trim().length > 0 || configured) && canUnlockCredential;
  };

  const loadSummary = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const next = await getBotManagerSummary();
      setSummary(next);
      const nextProviderAccounts = next.providerAccounts ?? (next.openRouterProfiles ?? []).map((profile) => ({
        ...profile,
        provider: "openrouter" as BotProvider,
        metadata: {},
      }));
      setProviderAccounts(nextProviderAccounts);
      setGeneralBase(next.generalConfig);
      const savedDraft = createGeneralConfigDraft(next.generalConfig);
      const storedDraft = readStoredGeneralConfigDraft();
      if (storedDraft && !sameGeneralConfigDraft(storedDraft, savedDraft)) {
        setGeneralDraft(storedDraft);
        setGeneralDraftDirty(true);
      } else if (!generalDraftDirtyRef.current) {
        if (storedDraft) clearStoredGeneralConfigDraft();
        setGeneralDraft(savedDraft);
        setGeneralDraftDirty(false);
      }
      if (next.openRouterProfiles) setOpenRouterProfiles(next.openRouterProfiles);
      const preferred = next.runtimeStatus.activeIdentityId ?? next.identities[0]?.id ?? null;
      setSelectedId((current) => current ?? preferred);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bot Manager unavailable.");
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadRuntimeStatus = useCallback(async (fresh = false) => {
    try {
      const next = await getBotRuntimeStatus({ fresh });
      setRuntimeStatus(next);
      setRuntimeError(null);
      return next;
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : "ZeroClaw runtime unavailable.");
      return null;
    }
  }, []);

  const loadOpenRouterProfiles = useCallback(async () => {
    try {
      const page = await listOpenRouterProfiles({ search: openRouterSearch, filter: openRouterFilter, page: openRouterPage, pageSize: 4 });
      setOpenRouterProfiles(page.items);
      setOpenRouterTotalPages(page.totalPages);
    } catch (err) {
      toast({ title: "OpenRouter profiles unavailable", description: err instanceof Error ? err.message : "Unable to load OpenRouter profiles." });
    }
  }, [openRouterFilter, openRouterPage, openRouterSearch, toast]);

  const loadProviderAnalytics = useCallback(async () => {
    if (!isBotProvider(summary?.runtimeStatus.activeProvider)) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const next = await getProviderAnalytics(selectedAnalyticsProvider, analyticsRange);
      setProviderAnalytics(next);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : "Provider analytics unavailable.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsRange, selectedAnalyticsProvider, summary?.runtimeStatus.activeProvider]);

  const loadBackupJobs = useCallback(async () => {
    try {
      const page = await listBotManagerBackups({ page: backupPage, pageSize: 5, status: backupStatus, mode: backupHistoryMode });
      setBackupJobs(page.items);
      setBackupTotalPages(page.totalPages);
    } catch (err) {
      toast({ title: "Backup history unavailable", description: err instanceof Error ? err.message : "Unable to load backup history." });
    }
  }, [backupHistoryMode, backupPage, backupStatus, toast]);

  const loadDetail = useCallback(async (id: string) => {
    setBusy("detail");
    try {
      const next = await getBotIdentity(id);
      setDetail(next);
      setIdentityDraft({
        name: next.name,
        roleTitle: next.roleTitle,
        description: next.description,
        runtimeProvider: next.runtimeProvider ?? "",
        runtimeProviderAccountId: next.runtimeProviderAccountId ?? next.runtimeOpenRouterProfileId ?? "",
        runtimeOpenRouterProfileId: next.runtimeOpenRouterProfileId ?? "",
        chatAccess: normalizeChatAccess(next.chatAccess),
      });
      const nextChannels = normalizeChannels(next.channels);
      const nextSettingsBase = asRecord(next.settings);
      const nextSettingsDraft = createSettingsDraft(next.settings);
      channelsDraftRef.current = nextChannels;
      settingsBaseRef.current = nextSettingsBase;
      settingsDraftRef.current = nextSettingsDraft;
      setChannelsDraft(nextChannels);
      setSettingsBase(nextSettingsBase);
      setSettingsDraft(nextSettingsDraft);
      const loreReference = asRecord(asRecord(next.settings).loreReference);
      setSelectedLoreId(readString(loreReference.id));
      setDefaultRegenerateConfirm("");
      setDefaultRegenerateMode("safe");
      const firstFile = next.files.find((file) => file.path === "SOUL.md") ?? next.files[0] ?? emptyFile();
      setFileDraft(firstFile);
    } catch (err) {
      toast({ title: "Bot detail unavailable", description: err instanceof Error ? err.message : "Unable to load bot detail." });
    } finally {
      setBusy(null);
    }
  }, [toast]);

  const runInitialRuntimeSync = useCallback(async () => {
    setBusy("sync");
    try {
      const nextSummary = await loadSummary(true);
      if (!nextSummary) throw new Error("Bot Manager unavailable.");
      const nextRuntime = await loadRuntimeStatus(true);
      const nextRuntimeConfigured = Boolean(nextSummary.runtimeStatus.runtimeConfigured);
      if (!nextRuntimeConfigured || !nextRuntime) {
        setSyncLog(toJsonText({ autoSync: true, skipped: true, reason: "ZeroClaw unavailable", runtime: nextRuntime }));
        setZeroClawAudit(null);
        return;
      }
      const result = await syncBotManagerRuntime();
      setSyncLog(toJsonText({ autoSync: true, ...result }));
      setZeroClawAudit(extractZeroClawAudit(result));
      const runtimePayload = result.runtime;
      if (runtimePayload && typeof runtimePayload === "object") setRuntimeStatus(runtimePayload as BotRuntimeStatus);
      await Promise.all([loadSummary(true), loadRuntimeStatus(true)]);
    } catch (err) {
      setSyncLog(toJsonText({ autoSync: true, error: err instanceof Error ? err.message : "Request failed." }));
      setZeroClawAudit(null);
      await Promise.all([loadSummary(true), loadRuntimeStatus(true)]);
    } finally {
      setBusy(null);
    }
  }, [loadRuntimeStatus, loadSummary]);

  useEffect(() => {
    if (allowed) {
      void loadSummary();
      void loadRuntimeStatus();
    }
  }, [allowed, loadRuntimeStatus, loadSummary]);

  useEffect(() => {
    if (!allowed || !pageVisible || initialRuntimeSyncRef.current) return;
    initialRuntimeSyncRef.current = true;
    void runInitialRuntimeSync();
  }, [allowed, pageVisible, runInitialRuntimeSync]);

  useEffect(() => {
    if (!allowed || !pageVisible) return undefined;
    const interval = window.setInterval(() => {
      void loadRuntimeStatus();
    }, RUNTIME_STATUS_POLL_MS);
    return () => window.clearInterval(interval);
  }, [allowed, loadRuntimeStatus, pageVisible]);

  useEffect(() => {
    if (allowed && pageVisible && activeMainTab === "providers") void loadProviderAnalytics();
  }, [activeMainTab, allowed, loadProviderAnalytics, pageVisible]);

  useEffect(() => {
    if (backupVisible) void loadBackupJobs();
  }, [backupVisible, loadBackupJobs]);

  useEffect(() => {
    if (!backupVisible || !hasActiveBackupJob) return undefined;
    const interval = window.setInterval(() => {
      void loadBackupJobs();
    }, BACKUP_ACTIVE_POLL_MS);
    return () => window.clearInterval(interval);
  }, [backupVisible, hasActiveBackupJob, loadBackupJobs]);

  useEffect(() => {
    if (!allowed || !pageVisible || !showCreatePersonality) return undefined;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      if (!createLoreSearch.trim()) {
        if (!cancelled) setCreateLoreOptions([]);
        return;
      }
      try {
        const result = await getCharactersPage({ search: createLoreSearch, searchScope: "name-traits", page: 1, pageSize: 100, sort: "name" });
        if (!cancelled) setCreateLoreOptions(prioritizeCharacterOptions(result.items, createLoreSearch).slice(0, 8));
      } catch {
        if (!cancelled) setCreateLoreOptions([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [allowed, createLoreSearch, pageVisible, showCreatePersonality]);

  useEffect(() => {
    if (!allowed || !pageVisible || !(editingIdentityId && activeTab === "settings")) return undefined;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      if (!loreSearch.trim()) {
        if (!cancelled) setLoreOptions([]);
        return;
      }
      try {
        const result = await getCharactersPage({ search: loreSearch, searchScope: "name-traits", page: 1, pageSize: 100, sort: "name" });
        if (!cancelled) setLoreOptions(prioritizeCharacterOptions(result.items, loreSearch).slice(0, 8));
      } catch {
        if (!cancelled) setLoreOptions([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [activeTab, allowed, editingIdentityId, loreSearch, pageVisible]);

  useEffect(() => {
    if (personalitiesVisible && selectedId && editingIdentityId === selectedId) void loadDetail(selectedId);
  }, [editingIdentityId, loadDetail, personalitiesVisible, selectedId]);

  useEffect(() => {
    if (!personalitiesVisible) return undefined;
    const restoreSearchInput = () => {
      const input = personalitySearchRef.current;
      if (!input || !isLikelyEmailAutofill(input.value)) return;
      const safeValue = isLikelyEmailAutofill(personalitySearch) ? "" : personalitySearch;
      input.value = safeValue;
      if (safeValue !== personalitySearch) {
        setPersonalitySearch(safeValue);
        setPersonalityPage(1);
      }
    };
    restoreSearchInput();
    const handles = [50, 200, 600, 1200].map((delay) => window.setTimeout(restoreSearchInput, delay));
    return () => handles.forEach((handle) => window.clearTimeout(handle));
  }, [editingIdentityId, personalitiesVisible, personalitySearch]);

  useEffect(() => {
    setRuntimeNow(Date.now());
  }, [observedGatewayState]);

  useEffect(() => {
    if (!pageVisible || observedGatewayState !== "running") return undefined;
    const interval = window.setInterval(() => setRuntimeNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [observedGatewayState, pageVisible]);

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!allowed) return <Navigate to="/home" replace />;

  const refreshVisibleData = async () => {
    const tasks: Array<Promise<unknown>> = [loadSummary(), loadRuntimeStatus()];
    if (activeMainTab === "providers") tasks.push(loadProviderAnalytics());
    if (backupVisible) tasks.push(loadBackupJobs());
    await Promise.all(tasks);
    if (personalitiesVisible && selectedId && editingIdentityId === selectedId) await loadDetail(selectedId);
  };

  const runAction = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key);
    try {
      await action();
      toast({ title: success });
    } catch (err) {
      toast({ title: "Bot Manager action failed", description: formatBotManagerError(err) });
    } finally {
      setBusy(null);
    }
  };

  const selectCreateLore = (character: Character) => {
    const nextAutofill = createCharacterAutofill(character);
    const previousAutofill = createAutofill;
    setSelectedCreateLore(character);
    setCreateLoreSearch(formatCharacterLabel(character));
    setCreateLoreOptions([]);
    setNewName((current) => (!current.trim() || current === previousAutofill?.name ? nextAutofill.name : current));
    setNewRole((current) => (!current.trim() || current === previousAutofill?.role ? nextAutofill.role : current));
    setNewDescription((current) => (!current.trim() || current === previousAutofill?.description ? nextAutofill.description : current));
    setCreateAutofill(nextAutofill);
  };

  const clearCreateLore = () => {
    setSelectedCreateLore(null);
    setCreateLoreSearch("");
    setCreateLoreOptions([]);
    setCreateAutofill(null);
  };

  const updateCreateLoreSearch = (value: string) => {
    setCreateLoreSearch(value);
    if (!selectedCreateLore || value === formatCharacterLabel(selectedCreateLore)) return;
    setSelectedCreateLore(null);
    setCreateAutofill(null);
  };

  const updatePersonalitySearch = (value: string) => {
    if (isLikelyEmailAutofill(value)) {
      window.setTimeout(() => {
        const input = personalitySearchRef.current;
        if (input && isLikelyEmailAutofill(input.value)) input.value = personalitySearch;
      }, 0);
      return;
    }
    setPersonalitySearch(value);
    setPersonalityPage(1);
  };

  const lockCredentials = () => {
    setCredentialUnlocked(false);
    setProviderDrafts({});
    setCredentialPassword("");
    setCredentialKey("");
    setCredentialConfirm("");
  };

  const unlockCredentials = () =>
    runAction(
      "credential-unlock",
      async () => {
        await unlockBotCredentials({
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        setCredentialUnlocked(true);
      },
      "Credentials unlocked",
    );

  const saveCredential = (provider: Exclude<BotProvider, "openrouter">) =>
    runAction(
      `credential-${provider}`,
      async () => {
        const draft = draftForProvider(provider);
        await updateBotCredential({
          provider,
          apiKey: draft.apiKey,
          apiBase: draft.apiBase.trim() || undefined,
          modelId: draft.modelId.trim(),
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        setProviderDrafts((current) => ({
          ...current,
          [provider]: { ...draft, apiKey: "" },
        }));
        await loadSummary();
        if (selectedAnalyticsProvider === provider) await loadProviderAnalytics();
      },
      "Credential saved",
    );

  const saveAnalyticsCredential = (provider: BotProvider) =>
    runAction(
      `analytics-credential-${provider}`,
      async () => {
        const draft = draftForProvider(provider);
        await updateProviderAnalyticsCredential({
          provider,
          apiKey: draft.analyticsApiKey,
          organizationId: draft.analyticsOrganizationId.trim() || undefined,
          projectId: draft.analyticsProjectId.trim() || undefined,
          apiKeyId: draft.analyticsApiKeyId.trim() || undefined,
          billingAccountId: draft.analyticsBillingAccountId.trim() || undefined,
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        setProviderDrafts((current) => ({
          ...current,
          [provider]: { ...draft, analyticsApiKey: "" },
        }));
        await loadSummary();
        if (selectedAnalyticsProvider === provider) await loadProviderAnalytics();
      },
      "Analytics credential saved",
    );

  const saveGeneralConfig = () =>
    runAction(
      "general",
      async () => {
        const saved = await updateBotGeneralConfig(generalConfigDraftToConfig(generalBase, generalDraft));
        clearStoredGeneralConfigDraft();
        setGeneralBase(saved);
        setGeneralDraft(createGeneralConfigDraft(saved));
        setGeneralDraftDirty(false);
        await loadSummary();
      },
      "General config saved",
    );

  const createIdentity = () =>
    runAction(
      "create-identity",
      async () => {
        const created = await createBotIdentity({
          name: newName,
          roleTitle: newRole,
          description: newDescription,
          profileImageUrl: characterProfileImage(selectedCreateLore) || undefined,
          loreCharacterId: selectedCreateLore?.id || undefined,
        });
        setNewName("");
        setNewRole("");
        setNewDescription("");
        setCreateLoreSearch("");
        setCreateLoreOptions([]);
        setSelectedCreateLore(null);
        setCreateAutofill(null);
        setShowCreatePersonality(false);
        setSelectedId(created.id);
        await loadSummary();
      },
      "Personality created",
    );

  const activateIdentity = (identity: BotIdentity) =>
    runAction(
      `activate-${identity.id}`,
      async () => {
        const activated = await activateBotIdentity(identity.id);
        const now = new Date().toISOString();
        const mode = summary?.runtimeStatus.runtimeMode ?? generalDraft.runtimeMode;
        setSummary((current) => current
          ? {
            ...current,
            identities: current.identities.map((item) => item.id === activated.id
              ? { ...item, ...activated }
              : mode === "multi-active-personality"
                ? item
                : { ...item, isActive: false, isMain: false }),
            runtimeStatus: {
              ...current.runtimeStatus,
              activeIdentityId: activated.id,
              activeIdentityIds: mode === "multi-active-personality"
                ? Array.from(new Set([...(current.runtimeStatus.activeIdentityIds ?? current.identities.filter((item) => item.isActive).map((item) => item.id)), activated.id]))
                : [activated.id],
              mainIdentityId: activated.isMain ? activated.id : current.runtimeStatus.mainIdentityId
            },
            runtimeSync: {
              ...current.runtimeSync,
              runtimeDirty: true,
              runtimeDirtySince: current.runtimeSync.runtimeDirtySince ?? now,
              runtimeDirtyReason: `Active personality changed: ${activated.name}`,
              lastRuntimeSyncError: null
            }
          }
          : current);
        setDetail((current) => current?.id === activated.id ? { ...current, ...activated } : current);
      },
      "Active personality updated",
    );

  const deactivateIdentity = (identity: BotIdentity) =>
    runAction(
      `deactivate-${identity.id}`,
      async () => {
        const updated = await deactivateBotIdentity(identity.id);
        setSummary((current) => current
          ? {
            ...current,
            identities: current.identities.map((item) => item.id === updated.id ? { ...item, ...updated } : item),
            runtimeStatus: {
              ...current.runtimeStatus,
              activeIdentityIds: (current.runtimeStatus.activeIdentityIds ?? []).filter((id) => id !== updated.id),
            },
            runtimeSync: {
              ...current.runtimeSync,
              runtimeDirty: true,
              runtimeDirtySince: current.runtimeSync.runtimeDirtySince ?? new Date().toISOString(),
              runtimeDirtyReason: `Active personality disabled: ${updated.name}`,
              lastRuntimeSyncError: null
            }
          }
          : current);
        setDetail((current) => current?.id === updated.id ? { ...current, ...updated } : current);
      },
      "Personality deactivated",
    );

  const makeMainIdentity = (identity: BotIdentity) =>
    runAction(
      `main-${identity.id}`,
      async () => {
        const updated = await setMainBotIdentity(identity.id);
        const mode = summary?.runtimeStatus.runtimeMode ?? generalDraft.runtimeMode;
        setSummary((current) => current
          ? {
            ...current,
            identities: current.identities.map((item) => item.id === updated.id
              ? { ...item, ...updated }
              : { ...item, isMain: false, isActive: mode === "single-active-personality" ? false : item.isActive }),
            runtimeStatus: {
              ...current.runtimeStatus,
              mainIdentityId: updated.id,
              activeIdentityId: updated.id,
              activeIdentityIds: mode === "single-active-personality" ? [updated.id] : Array.from(new Set([...(current.runtimeStatus.activeIdentityIds ?? []), updated.id])),
            },
            runtimeSync: {
              ...current.runtimeSync,
              runtimeDirty: true,
              runtimeDirtySince: current.runtimeSync.runtimeDirtySince ?? new Date().toISOString(),
              runtimeDirtyReason: `Main personality changed: ${updated.name}`,
              lastRuntimeSyncError: null
            }
          }
          : current);
        setDetail((current) => current?.id === updated.id ? { ...current, ...updated } : current);
      },
      "Main personality updated",
    );

  const removeIdentity = (identity: BotIdentity) =>
    runAction(
      `delete-${identity.id}`,
      async () => {
        await deleteBotIdentity(identity.id);
        if (selectedId === identity.id) {
          setSelectedId(null);
          setDetail(null);
        }
        await refreshVisibleData();
      },
      "Personality deleted",
    );

  const activateProvider = (provider: Exclude<BotProvider, "openrouter">) =>
    runAction(
      `provider-${provider}`,
      async () => {
        await activateBotProvider(provider, {
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        await refreshVisibleData();
      },
      "Provider activated",
    );

  const resetProviderAccountDraft = (provider: BotProvider = providerAccountProvider) => {
    setProviderAccountDraft({
      provider,
      name: "",
      apiKey: "",
      apiBase: "",
      modelId: defaultModelIds[provider] ?? "",
      tags: [],
      notes: "",
    });
  };

  const saveProviderAccount = () =>
    runAction(
      providerAccountDraft.id ? `provider-account-${providerAccountDraft.id}` : "provider-account-create",
      async () => {
        const payload = {
          provider: providerAccountDraft.provider,
          name: providerAccountDraft.name.trim(),
          apiKey: providerAccountDraft.apiKey,
          apiBase: providerAccountDraft.apiBase.trim() || undefined,
          modelId: providerAccountDraft.modelId.trim(),
          tags: providerAccountDraft.tags,
          notes: providerAccountDraft.notes,
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS" as const,
        };
        if (providerAccountDraft.id) await updateProviderAccount(providerAccountDraft.id, payload);
        else await createProviderAccount(payload);
        resetProviderAccountDraft(providerAccountDraft.provider);
        await refreshVisibleData();
      },
      providerAccountDraft.id ? "Provider account updated" : "Provider account created",
    );

  const setActiveProviderAccount = (account: BotProviderAccount) =>
    runAction(
      `provider-account-activate-${account.id}`,
      async () => {
        await activateProviderAccount(account.id, {
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        await refreshVisibleData();
      },
      "Provider account activated",
    );

  const removeProviderAccount = (account: BotProviderAccount) =>
    runAction(
      `provider-account-delete-${account.id}`,
      async () => {
        await deleteProviderAccount(account.id, {
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        if (providerAccountDraft.id === account.id) resetProviderAccountDraft(account.provider as BotProvider);
        await refreshVisibleData();
      },
      "Provider account deleted",
    );

  const saveOpenRouterProfile = () =>
    runAction(
      openRouterDraft.id ? `openrouter-${openRouterDraft.id}` : "openrouter-create",
      async () => {
        const payload = {
          name: openRouterDraft.name,
          apiKey: openRouterDraft.apiKey,
          apiBase: openRouterDraft.apiBase.trim() || undefined,
          modelId: openRouterDraft.modelId,
          tags: openRouterDraft.tags,
          notes: openRouterDraft.notes,
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS" as const,
        };
        if (openRouterDraft.id) await updateOpenRouterProfile(openRouterDraft.id, payload);
        else await createOpenRouterProfile(payload);
        setOpenRouterDraft({ name: "", apiKey: "", apiBase: "", modelId: "", tags: [], notes: "" });
        await refreshVisibleData();
      },
      openRouterDraft.id ? "OpenRouter profile updated" : "OpenRouter profile created",
    );

  const setActiveOpenRouterProfile = (profile: OpenRouterProfile) =>
    runAction(
      `openrouter-activate-${profile.id}`,
      async () => {
        await activateOpenRouterProfile(profile.id, {
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        await refreshVisibleData();
      },
      "OpenRouter profile activated",
    );

  const removeOpenRouterProfile = (profile: OpenRouterProfile) =>
    runAction(
      `openrouter-delete-${profile.id}`,
      async () => {
        await deleteOpenRouterProfile(profile.id, {
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        await refreshVisibleData();
      },
      "OpenRouter profile deleted",
    );

  const saveIdentity = () =>
    detail &&
    runAction(
      "identity",
      async () => {
        const submittedChannels = channelsDraftRef.current;
        const submittedSettings = mergeRecord(settingsBaseRef.current, settingsDraftToConfig(settingsDraftRef.current));
        const updated = await updateBotIdentity(detail.id, {
          name: identityDraft.name,
          roleTitle: identityDraft.roleTitle,
          description: identityDraft.description,
          runtimeProvider: identityDraft.runtimeProvider || undefined,
          runtimeProviderAccountId: identityDraft.runtimeProvider ? identityDraft.runtimeProviderAccountId || undefined : "",
          runtimeOpenRouterProfileId: "",
          chatAccess: normalizeChatAccess(identityDraft.chatAccess),
          channels: submittedChannels,
          settings: submittedSettings,
          loreCharacterId: selectedLoreId || undefined,
        });
        setDetail((current) => (current && current.id === updated.id ? { ...current, ...updated, files: current.files } : current));
        setIdentityDraft({
          name: updated.name,
          roleTitle: updated.roleTitle,
          description: updated.description,
          runtimeProvider: updated.runtimeProvider ?? "",
          runtimeProviderAccountId: updated.runtimeProviderAccountId ?? updated.runtimeOpenRouterProfileId ?? "",
          runtimeOpenRouterProfileId: updated.runtimeOpenRouterProfileId ?? "",
          chatAccess: normalizeChatAccess(updated.chatAccess),
        });
        const nextChannels = normalizeChannels(updated.channels);
        const nextSettingsBase = asRecord(updated.settings);
        const nextSettingsDraft = createSettingsDraft(updated.settings);
        channelsDraftRef.current = nextChannels;
        settingsBaseRef.current = nextSettingsBase;
        settingsDraftRef.current = nextSettingsDraft;
        setChannelsDraft(nextChannels);
        setSettingsBase(nextSettingsBase);
        setSettingsDraft(nextSettingsDraft);
        const loreReference = asRecord(asRecord(updated.settings).loreReference);
        setSelectedLoreId(readString(loreReference.id));
        await Promise.all([loadSummary(true), loadRuntimeStatus(true)]);
      },
      "Personality saved",
    );

  const regenerateDefaults = () =>
    detail &&
    runAction(
      "default-files",
      async () => {
        const result = await regenerateBotIdentityDefaultFiles(detail.id, {
          confirmText: "DEFAULTS",
          mode: defaultRegenerateMode,
        });
        setSyncLog(toJsonText(result));
        setDefaultRegenerateConfirm("");
        await loadDetail(detail.id);
        await loadSummary(true);
      },
      "Default files regenerated",
    );

  const saveFile = () =>
    detail &&
    runAction(
      "file",
      async () => {
        const saved = await saveBotIdentityFile(detail.id, {
          path: fileDraft.path,
          kind: fileDraft.kind,
          content: fileDraft.content,
          contentType: fileDraft.contentType,
        });
        setFileDraft(saved);
        await loadDetail(detail.id);
        await loadSummary();
      },
      "File saved",
    );

  const removeFile = () =>
    detail &&
    runAction(
      "file-delete",
      async () => {
        await deleteBotIdentityFile(detail.id, fileDraft.path);
        await loadDetail(detail.id);
        await loadSummary();
      },
      "File deleted",
    );

  const uploadProfile = (file: File) =>
    detail &&
    runAction(
      "profile",
      async () => {
        await uploadBotProfileImage(detail.id, file);
        await refreshVisibleData();
      },
      "Profile image uploaded",
    );

  const syncRuntime = async () => {
    if (generalDraftDirty) {
      setActiveMainTab("config");
      toast({
        title: "Save General Config first",
        description: "Sync uses the backend-saved config. Save or reset the local draft before syncing.",
      });
      return;
    }

    setBusy("sync");
    try {
      const nextSummary = await loadSummary();
      if (!nextSummary) throw new Error("Bot Manager unavailable.");
      await loadRuntimeStatus(true);

      const result = await syncBotManagerRuntime();
      setSyncLog(toJsonText(result));
      setZeroClawAudit(extractZeroClawAudit(result));
      const runtimePayload = result.runtime;
      if (runtimePayload && typeof runtimePayload === "object") setRuntimeStatus(runtimePayload as BotRuntimeStatus);
      await refreshVisibleData();
      toast({
        title: result.reloadSkipped ? "Runtime reload skipped" : result.restartGateway ? "Runtime synced and restarted" : "Runtime synced",
        description: result.reloadSkipped ? result.reason : undefined,
      });
    } catch (err) {
      await loadSummary();
      await loadRuntimeStatus(true);
      setZeroClawAudit(null);
      toast({ title: "Bot Manager action failed", description: formatBotManagerError(err) });
    } finally {
      setBusy(null);
    }
  };

  const controlRuntime = (action: "start" | "stop" | "restart") =>
    runAction(
      `runtime-${action}`,
      async () => {
        const result = await controlBotRuntime(action);
        setRuntimeStatus(result);
        setRuntimeError(null);
        setSyncLog(toJsonText(result));
      },
      `ZeroClaw ${action} requested`,
    );

  const controlRuntimeIdentity = (identity: BotIdentity, action: "start" | "stop" | "restart") =>
    runAction(
      `runtime-${identity.id}-${action}`,
      async () => {
        const result = await controlBotRuntimeForIdentity(identity.id, action);
        setRuntimeStatus(result);
        setRuntimeError(null);
        setSyncLog(toJsonText(result));
      },
      `${identity.name} ${action} requested`,
    );

  const createBackup = () =>
    runAction(
      "backup-create",
      async () => {
        await createBotManagerBackup({
          mode: backupMode,
          identityIds: backupMode === "custom" ? backupSelectedIds : undefined,
          password: backupPassword,
          secretKey: backupKey,
          confirmText: "PERSONALITY",
        });
        setBackupPassword("");
        setBackupConfirm("");
        await loadBackupJobs();
      },
      "Backup generation started",
    );

  const downloadBackup = (job: BotManagerBackupJob) =>
    runAction(
      `backup-download-${job.id}`,
      async () => {
        const ticket = await createBotManagerBackupDownloadTicket(job.id, backupKey);
        window.open(getBotManagerBackupDownloadUrl(job.id, ticket.ticket), "_blank", "noopener,noreferrer");
      },
      "Backup download prepared",
    );

  const clearBackups = (ids?: string[]) =>
    runAction(
      "backup-clear",
      async () => {
        await clearBotManagerBackups(ids);
        await loadBackupJobs();
      },
      "Backup history cleared",
    );

  const importBackup = () =>
    backupImportFile &&
    runAction(
      "backup-import",
      async () => {
        const result = await importBotManagerBackup({
          backupFile: backupImportFile,
          password: backupImportPassword,
          secretKey: backupImportKey,
          confirmText: "PERSONALITY",
        });
        setSyncLog(toJsonText({ backupImport: result }));
        setBackupImportFile(null);
        setBackupImportPassword("");
        setBackupImportKey("");
        setBackupImportConfirm("");
        await refreshVisibleData();
      },
      "Backup imported",
    );

  const memoryFiles = detail?.files.filter(isMemoryFile) ?? [];
  const cronFiles = detail?.files.filter(isCronFile) ?? [];
  const sessionFiles = detail?.files.filter(isSessionFile) ?? [];
  const workspaceFiles = detail?.files.filter((file) => !isMemoryFile(file) && !isCronFile(file) && !isSessionFile(file)) ?? [];
  const runtimeConfigured = Boolean(summary?.runtimeStatus.runtimeConfigured);
  const runtimeActionDisabled = Boolean(busy) || !runtimeConfigured;
  const gatewayState = runtimeStatus?.gateway?.state ?? (runtimeConfigured ? "unknown" : "not configured");
  const gatewayRunning = gatewayState === "running";
  const gatewayTransitioning = gatewayState === "starting" || gatewayState === "stopping";
  const gatewayStartedAtMs = runtimeStatus?.gateway?.startedAt ? Date.parse(runtimeStatus.gateway.startedAt) : Number.NaN;
  const gatewayUptimeSeconds = gatewayRunning
    ? Number.isFinite(gatewayStartedAtMs)
      ? Math.max(Math.floor((runtimeNow - gatewayStartedAtMs) / 1000), 0)
      : runtimeStatus?.gateway?.uptime ?? 0
    : 0;
  const runtimeMode = summary?.runtimeStatus.runtimeMode ?? generalDraft.runtimeMode;
  const isMultiRuntime = runtimeMode === "multi-active-personality";
  const activeRuntimeIdentities = (summary?.identities ?? []).filter((identity) => identity.isActive || (runtimeMode === "single-active-personality" && identity.isMain));
  const runtimeStatusByIdentity = new Map((runtimeStatus?.gateway?.runtimes ?? []).map((runtime) => [runtime.identityId, runtime]));
  const runningRuntimeCount = activeRuntimeIdentities.filter((identity) => (runtimeStatusByIdentity.get(identity.id)?.state ?? (identity.isMain ? gatewayState : "stopped")) === "running").length;
  const enabledRuntimeChannelCount = activeRuntimeIdentities.reduce((total, identity) => {
    const channels = Object.values(asRecord(identity.channels)).filter((value) => asRecord(value).enabled === true).length;
    return total + channels;
  }, 0);
  const runtimeDirty = Boolean(summary?.runtimeSync.runtimeDirty);
  const runtimeConflictCount = summary?.runtimeSync.lastRuntimePullConflictCount ?? 0;
  const syncUnavailable = Boolean(error && !summary);
  const syncBlockedByLocalDraft = generalDraftDirty && !syncUnavailable;
  const syncState = busy === "sync"
    ? "Syncing"
    : syncBlockedByLocalDraft
      ? "Save config first"
    : runtimeError
      ? "ZeroClaw unavailable"
      : runtimeConflictCount > 0
        ? `Sync conflict (${runtimeConflictCount})`
      : runtimeDirty && summary?.runtimeSync.lastRuntimeSyncError
        ? "Sync failed"
        : runtimeDirty
          ? "Sync needed"
          : "Up to date";
  const syncStateVariant: "default" | "outline" | "destructive" =
    syncState === "Sync failed" || syncState === "ZeroClaw unavailable" || syncState.startsWith("Sync conflict") ? "destructive" : syncState === "Sync needed" || syncState === "Save config first" ? "default" : "outline";
  const lastSyncRaw = runtimeStatus?.morneven?.syncedAt ?? summary?.runtimeSync.lastRuntimeSyncAt;
  const lastSync = lastSyncRaw
    ? new Date(lastSyncRaw).toLocaleString()
    : "Never";
  const activeProvider = summary?.runtimeStatus.activeProvider ?? "";
  const activeOpenRouterProfileId = summary?.runtimeStatus.activeOpenRouterProfileId ?? "";
  const activeProviderAccountId = summary?.runtimeStatus.activeProviderAccountId ?? activeOpenRouterProfileId;
  const activeProviderAccountName = providerAccounts.find((account) => account.id === activeProviderAccountId)?.name ?? "";
  const syncReasonText = runtimeDirty ? (summary?.runtimeSync.runtimeDirtyReason ?? "Runtime changes pending") : "No pending runtime changes";
  const currentProviderAnalytics = providerAnalytics?.provider === selectedAnalyticsProvider ? providerAnalytics : null;
  const balanceSparklineData = (() => {
    const creditBalance = currentProviderAnalytics?.creditBalance;
    if (typeof creditBalance !== "number" || !Number.isFinite(creditBalance)) return [];
    const points = currentProviderAnalytics?.points ?? [];
    if (points.length === 0) {
      return [{
        date: new Date().toISOString().slice(0, 10),
        creditBalance,
        dailySpend: 0,
      }];
    }
    const totalCost = points.reduce((total, point) => total + (Number.isFinite(point.cost) ? Math.max(point.cost, 0) : 0), 0);
    let spentThroughPoint = 0;
    return points.map((point) => {
      const pointCost = Number.isFinite(point.cost) ? Math.max(point.cost, 0) : 0;
      spentThroughPoint += pointCost;
      return {
        date: point.date,
        creditBalance: creditBalance + Math.max(totalCost - spentThroughPoint, 0),
        dailySpend: pointCost,
      };
    });
  })();
  const personalityPageSize = 5;
  const filteredPersonalities = (summary?.identities ?? []).filter((identity) => {
    const haystack = `${identity.name} ${identity.roleTitle} ${identity.description}`.toLowerCase();
    const matchesSearch = !personalitySearch.trim() || haystack.includes(personalitySearch.trim().toLowerCase());
    const loreReference = asRecord(asRecord(identity.settings).loreReference);
    const matchesFilter =
      personalityFilter === "all" ||
      (personalityFilter === "active" && identity.isActive) ||
      (personalityFilter === "inactive" && !identity.isActive) ||
      (personalityFilter === "missing-lore" && !readString(loreReference.id));
    return matchesSearch && matchesFilter;
  });
  const personalityTotalPages = Math.max(Math.ceil(filteredPersonalities.length / personalityPageSize), 1);
  const pagedPersonalities = filteredPersonalities.slice((personalityPage - 1) * personalityPageSize, personalityPage * personalityPageSize);
  const backupCanCreate =
    backupPassword.length > 0 &&
    backupKey.trim().length >= 16 &&
    backupConfirm === "PERSONALITY" &&
    (backupMode === "full" || backupSelectedIds.length > 0);
  const backupCanImport =
    Boolean(backupImportFile) &&
    backupImportPassword.length > 0 &&
    backupImportKey.trim().length >= 16 &&
    backupImportConfirm === "PERSONALITY";
  const toggleSection = (key: string) => setCollapsedSections((current) => ({ ...current, [key]: !current[key] }));
  const updateChannel = (channel: ChannelKey, patch: JsonRecord) => {
    setChannelsDraft((current) => ({
      ...current,
      [channel]: {
        ...asRecord(current[channel]),
        ...patch,
      },
    }));
    channelsDraftRef.current = {
      ...channelsDraftRef.current,
      [channel]: {
        ...asRecord(channelsDraftRef.current[channel]),
        ...patch,
      },
    };
  };

  const updateSettingsDraft = (patch: Partial<BotSettingsDraft>) => {
    settingsDraftRef.current = { ...settingsDraftRef.current, ...patch };
    setSettingsDraft(settingsDraftRef.current);
  };

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl uppercase tracking-[0.14em] text-primary md:text-4xl">Bot Manager</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={syncStateVariant}>{syncState}</Badge>
            <Button type="button" onClick={() => void syncRuntime()} disabled={loading || busy === "sync" || syncUnavailable || syncBlockedByLocalDraft}>
              {busy === "sync" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {error && !summary ? (
          <div className={cn(panelClass, "flex min-h-[24rem] flex-col items-center justify-center text-center")}>
            <Bot className="h-10 w-10 text-destructive" />
            <h2 className="mt-4 font-heading text-xl text-foreground">Bot Manager service unavailable</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Backend or Bot Manager service is not connected. Sync can retry the connection when the service is available.</p>
            <Button type="button" className="mt-4" onClick={() => void syncRuntime()} disabled={busy === "sync"}>
              {busy === "sync" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync
            </Button>
          </div>
        ) : (
        <>
        <div className="hud-border bg-card/40 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-display uppercase tracking-[0.18em] text-muted-foreground">Status</span>
          <Badge variant="outline" className="font-heading"><Brain className="mr-1 h-3 w-3" />{activeIdentity?.name ?? "No persona"}</Badge>
          <Badge variant={syncStateVariant}>Sync: {syncState}</Badge>
          <Badge variant="outline">Gateway: {gatewayState}</Badge>
          {runtimeDirty && <Badge variant="destructive">Runtime dirty</Badge>}
          <span className="min-w-0 truncate text-muted-foreground">Reason: {syncReasonText}</span>
        </div>
        <div role="tablist" aria-label="Bot Manager sections" className="hud-border bg-card/40 p-1 flex gap-1 overflow-x-auto">
          {([
            { key: "runtime", label: "Runtime", icon: Bot },
            { key: "providers", label: "Providers", icon: KeyRound },
            { key: "personalities", label: "Personalities", icon: Brain },
            { key: "config", label: "Config", icon: Settings },
            { key: "backups", label: "Backups", icon: Download },
          ] as const).map((tab) => {
            const isActive = activeMainTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveMainTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-2 font-heading text-xs uppercase tracking-[0.14em] transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="space-y-4">
          {activeMainTab === "runtime" && (
          <div className={panelClass}>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Bot className="h-4 w-4" />
                <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Runtime</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{isMultiRuntime ? `${activeRuntimeIdentities.length} active runtimes` : "Single runtime"}</Badge>
                {!isMultiRuntime && (
                  <>
                    <Button type="button" variant="outline" onClick={() => controlRuntime("start")} disabled={runtimeActionDisabled || gatewayRunning || gatewayTransitioning}>
                      {busy === "runtime-start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                      Start
                    </Button>
                    <Button type="button" variant="outline" onClick={() => controlRuntime("stop")} disabled={runtimeActionDisabled || !gatewayRunning || gatewayTransitioning}>
                      {busy === "runtime-stop" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                      Stop
                    </Button>
                    <Button type="button" variant="outline" onClick={() => controlRuntime("restart")} disabled={runtimeActionDisabled || !gatewayRunning || gatewayTransitioning}>
                      {busy === "runtime-restart" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Restart
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <Metric label={isMultiRuntime ? "Runtime Mode" : "Active Personality"} value={isMultiRuntime ? "Multi active personality" : ((summary?.identities.find((identity) => identity.isMain) ?? activeIdentity)?.name ?? "None")} />
              <Metric label={isMultiRuntime ? "Active Runtimes" : "Gateway State"} value={isMultiRuntime ? String(activeRuntimeIdentities.length) : gatewayState} />
              <Metric label={isMultiRuntime ? "Running Runtimes" : "Gateway Uptime"} value={isMultiRuntime ? `${runningRuntimeCount} running / ${Math.max(activeRuntimeIdentities.length - runningRuntimeCount, 0)} stopped` : formatUptime(gatewayUptimeSeconds)} />
              <Metric label={isMultiRuntime ? "Enabled Channels" : "Last Sync"} value={isMultiRuntime ? String(enabledRuntimeChannelCount) : lastSync} />
              <Metric label={isMultiRuntime ? "Main Personality" : "Provider / Account"} value={isMultiRuntime ? ((summary?.identities.find((identity) => identity.isMain) ?? activeIdentity)?.name ?? "None") : `${activeProvider || "default provider"}${activeProviderAccountName ? ` / ${activeProviderAccountName}` : ""}`} />
              <Metric label="Saved Personalities" value={String(summary?.identities.length ?? 0)} />
              <Metric label="ZeroClaw Link" value={runtimeConfigured ? "Configured" : "Not configured"} />
              <Metric label="Sync State" value={syncState} />
            </div>
            {zeroClawAudit && (
              <div className="mt-4 rounded-sm border border-border/70 bg-background/35 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="h-4 w-4" />
                    <h3 className="font-heading text-xs uppercase tracking-[0.14em]">ZeroClaw Translation Audit</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">v{zeroClawAudit.translationVersion ?? "?"}</Badge>
                    <Badge variant="outline">{zeroClawAudit.identityCount} identities</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {zeroClawAudit.identities.map((identity) => (
                    <div key={identity.identityId || identity.slug || identity.name} className="rounded-sm border border-border/70 bg-card/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-heading text-sm text-foreground">{identity.name || identity.slug || identity.identityId}</p>
                          <p className="truncate text-xs text-muted-foreground">{identity.slug || identity.identityId}</p>
                        </div>
                        {identity.isMain && <Badge variant="outline">Main</Badge>}
                      </div>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-5">
                        {[
                          ["Canonical", identity.audit.canonicalFileCount],
                          ["Workspace", identity.audit.workspaceFileCount],
                          ["Cron", identity.audit.cronJobCount],
                          ["Skipped", identity.audit.cronSkippedCount],
                          ["Memory", identity.audit.memoryReferenceCount],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="min-w-0 rounded-sm border border-border/60 bg-background/35 p-2">
                            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                            <p className="mt-1 font-heading text-sm text-foreground">{formatCount(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isMultiRuntime && (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {activeRuntimeIdentities.map((identity) => {
                  const status = runtimeStatusByIdentity.get(identity.id);
                  const state = status?.state ?? (identity.isMain ? gatewayState : "stopped");
                  const isRunning = state === "running";
                  const isTransitioning = state === "starting" || state === "stopping";
                  const startedAtMs = status?.startedAt ? Date.parse(status.startedAt) : Number.NaN;
                  const uptime = isRunning
                    ? Number.isFinite(startedAtMs)
                      ? Math.max(Math.floor((runtimeNow - startedAtMs) / 1000), 0)
                      : status?.uptime ?? 0
                    : 0;
                  const providerLabel = identity.runtimeProvider || activeProvider || "default provider";
                  const runtimeAccountId = identity.runtimeProviderAccountId || identity.runtimeOpenRouterProfileId || (providerLabel === activeProvider ? activeProviderAccountId : "");
                  const accountLabel = providerAccounts.find((account) => account.id === runtimeAccountId)?.name;
                  const enabledChannels = Object.entries(asRecord(identity.channels))
                    .filter(([, value]) => asRecord(value).enabled === true)
                    .map(([key]) => key)
                    .join(", ") || "No enabled channels";
                  return (
                    <div key={identity.id} className="rounded-sm border border-border/80 bg-background/30 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <Profile identity={identity} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-heading text-base text-foreground">{identity.name}</h3>
                              {identity.isMain && <Badge variant="outline">Main</Badge>}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{providerLabel}{accountLabel ? ` / ${accountLabel}` : ""}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{enabledChannels}</p>
                          </div>
                        </div>
                        <Badge variant={isRunning ? "default" : "outline"}>{state}</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <Metric label="Uptime" value={formatUptime(uptime)} />
                        <Metric label="PID" value={status?.pid ? String(status.pid) : "-"} />
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <Button type="button" variant="outline" onClick={() => controlRuntimeIdentity(identity, "start")} disabled={runtimeActionDisabled || isRunning || isTransitioning}>
                          {busy === `runtime-${identity.id}-start` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                          Start
                        </Button>
                        <Button type="button" variant="outline" onClick={() => controlRuntimeIdentity(identity, "stop")} disabled={runtimeActionDisabled || !isRunning || isTransitioning}>
                          {busy === `runtime-${identity.id}-stop` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                          Stop
                        </Button>
                        <Button type="button" variant="outline" onClick={() => controlRuntimeIdentity(identity, "restart")} disabled={runtimeActionDisabled || !isRunning || isTransitioning}>
                          {busy === `runtime-${identity.id}-restart` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Restart
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {activeRuntimeIdentities.length === 0 && (
                  <div className="rounded-sm border border-border/70 bg-background/35 p-6 text-center text-sm text-muted-foreground">
                    No active runtime personalities.
                  </div>
                )}
              </div>
            )}
            {runtimeError && (
              <div className="mt-3 rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {runtimeError}
              </div>
            )}
            {summary?.runtimeSync.lastRuntimeSyncError && (
              <div className="mt-3 rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {summary.runtimeSync.lastRuntimeSyncError}
              </div>
            )}
          </div>

          )}
          {activeMainTab === "providers" && (
          <div className={panelClass}>
            <div className="flex items-center gap-2 text-primary">
              <KeyRound className="h-4 w-4" />
              <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Providers</h2>
            </div>

            <div className="mt-4 space-y-5">
              <div className="rounded-sm border border-border/70 bg-background/35 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <BarChart3 className="h-4 w-4" />
                    <h3 className="font-heading text-xs uppercase tracking-[0.14em]">Provider Analytics</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select className={cn(inputClass, "h-9 w-28 py-1.5")} value={analyticsRange} onChange={(event) => setAnalyticsRange(event.target.value as "7d" | "30d" | "90d")}>
                      <option value="7d">7 days</option>
                      <option value="30d">30 days</option>
                      <option value="90d">90 days</option>
                    </select>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadProviderAnalytics()} disabled={analyticsLoading}>
                      {analyticsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Refresh
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {providers.map((provider) => {
                    const credential = credentialForProvider(provider.value);
                    const analyticsCredential = analyticsCredentialForProvider(provider.value);
                    const isSelected = selectedAnalyticsProvider === provider.value;
                    const isActive = activeProvider === provider.value;
                    const needsAnalyticsKey = analyticsKeyProviders.has(provider.value) && !analyticsCredential?.configured;
                    return (
                      <button
                        key={provider.value}
                        type="button"
                        onClick={() => setSelectedAnalyticsProvider(provider.value)}
                        className={cn(
                          "rounded-sm border bg-background/40 p-3 text-left transition hover:border-primary/60",
                          isSelected ? "border-primary" : "border-border/70",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-heading text-sm text-foreground">{provider.label}</span>
                          {isActive && <Badge className="text-[10px]">Active</Badge>}
                          {provider.value === "openrouter" ? (
                            providerAccounts.some((account) => account.provider === provider.value) ? <Badge variant="outline" className="text-[10px]">Configured</Badge> : <Badge variant="destructive" className="text-[10px]">Missing</Badge>
                          ) : credential?.configured ? (
                            <Badge variant="outline" className="text-[10px]">Configured</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Missing</Badge>
                          )}
                          {needsAnalyticsKey && <Badge variant="secondary" className="text-[10px]">Needs key</Badge>}
                          {!analyticsKeyProviders.has(provider.value) && !["deepseek", "openrouter"].includes(provider.value) && <Badge variant="secondary" className="text-[10px]">Local</Badge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <Metric label="Credit Balance" value={creditBalanceMetricParts(currentProviderAnalytics)} info={creditBalanceInfo(currentProviderAnalytics)}>
                      {balanceSparklineData.length > 0 && (
                        <ChartContainer
                          config={{
                            creditBalance: { label: "Balance", color: "hsl(var(--success))" },
                          }}
                          className="h-20 aspect-auto"
                        >
                          <AreaChart data={balanceSparklineData} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={4} minTickGap={12} tickFormatter={formatChartDate} />
                            <YAxis
                              hide
                              domain={[
                                (value: number) => Math.max(0, value - Math.max(Math.abs(value) * 0.04, 0.25)),
                                (value: number) => value + Math.max(Math.abs(value) * 0.04, 0.25),
                              ]}
                            />
                            <ChartTooltip content={<BalanceSparklineTooltip currency={currentProviderAnalytics?.currency ?? "USD"} />} />
                            <Area type="monotone" dataKey="creditBalance" stroke="var(--color-creditBalance)" fill="var(--color-creditBalance)" fillOpacity={0.16} strokeWidth={2} dot={{ r: 2.8, strokeWidth: 1.5 }} activeDot={{ r: 4 }} />
                          </AreaChart>
                        </ChartContainer>
                      )}
                    </Metric>
                    <Metric label="Monthly Spend" value={formatMoney(currentProviderAnalytics?.monthlySpend, currentProviderAnalytics?.currency ?? "USD")} />
                    <Metric label="Requests" value={formatCount(currentProviderAnalytics?.localRequestCount)} />
                    <Metric label="Tokens" value={formatCount(currentProviderAnalytics?.localTotalTokens)} />
                  </div>
                  <div className="rounded-sm border border-border/70 bg-background/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={currentProviderAnalytics?.status === "provider_error" ? "destructive" : currentProviderAnalytics?.status === "ok" ? "default" : "outline"}>
                          {currentProviderAnalytics?.status ?? "loading"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{currentProviderAnalytics?.statusMessage ?? analyticsError ?? "Loading provider analytics"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{currentProviderAnalytics?.source ?? "local"}</span>
                    </div>
                    {analyticsError && <div className="mt-3 rounded-sm border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{analyticsError}</div>}
                    <ChartContainer
                      config={{
                        totalTokens: { label: "Tokens", color: "hsl(var(--primary))" },
                        requests: { label: "Requests", color: "hsl(var(--info))" },
                      }}
                      className="mt-3 h-64 aspect-auto"
                    >
                      <AreaChart data={currentProviderAnalytics?.points ?? []} margin={{ left: 8, right: 8, top: 12, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                        <YAxis yAxisId="tokens" tickLine={false} axisLine={false} width={48} tickFormatter={(value) => formatAxisCount(Number(value))} domain={[0, "dataMax"]} />
                        <YAxis yAxisId="requests" orientation="right" tickLine={false} axisLine={false} width={36} tickFormatter={(value) => formatAxisCount(Number(value))} domain={[0, "dataMax"]} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area yAxisId="tokens" type="monotone" dataKey="totalTokens" stroke="var(--color-totalTokens)" fill="var(--color-totalTokens)" fillOpacity={0.22} strokeWidth={2} />
                        <Area yAxisId="requests" type="monotone" dataKey="requests" stroke="var(--color-requests)" fill="var(--color-requests)" fillOpacity={0.14} strokeWidth={2} />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-sm border border-border/70 bg-background/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={activeProvider ? "default" : "outline"}>
                      Active provider: {activeProvider || "none"}
                    </Badge>
                    {activeProvider && (
                      <Badge variant="outline">Account: {providerAccounts.find((account) => account.id === activeProviderAccountId)?.name ?? "default"}</Badge>
                    )}
                  </div>
                  {credentialUnlocked && (
                    <Button type="button" variant="outline" onClick={lockCredentials} disabled={Boolean(busy)}>
                      Lock
                    </Button>
                  )}
                </div>
                {!credentialUnlocked ? (
                  <div className="mt-4 grid gap-3 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <Field label="Password" value={credentialPassword} onChange={setCredentialPassword} type="password" name="bot-manager-credential-password" />
                    <Field label="Bot Manager Key" value={credentialKey} onChange={setCredentialKey} type="password" name="bot-manager-credential-key" />
                    <Field label="Confirmation" value={credentialConfirm} onChange={setCredentialConfirm} placeholder='Type "CREDENTIALS"' />
                    <Button type="button" onClick={unlockCredentials} disabled={!canUnlockCredential || Boolean(busy)}>
                      {busy === "credential-unlock" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                      Unlock
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-5">
                    <ProviderAccountsSection
                      accounts={providerAccounts}
                      activeProvider={activeProvider}
                      activeProviderAccountId={activeProviderAccountId}
                      busy={busy}
                      canUseCredentialGate={canUnlockCredential}
                      draft={providerAccountDraft}
                      filter={providerAccountFilter}
                      onActivate={setActiveProviderAccount}
                      onDelete={removeProviderAccount}
                      onDraftChange={setProviderAccountDraft}
                      onFilterChange={setProviderAccountFilter}
                      onProviderChange={(provider) => { setProviderAccountProvider(provider); resetProviderAccountDraft(provider); }}
                      onSave={saveProviderAccount}
                      onSearchChange={setProviderAccountSearch}
                      providers={providers}
                      search={providerAccountSearch}
                      selectedProvider={providerAccountProvider}
                    />
                    <div className="rounded-sm border border-border/70 bg-background/35 p-4">
                      <div>
                        <h3 className="font-heading text-base text-foreground">Provider analytics credentials</h3>
                        <p className="text-xs text-muted-foreground">Analytics keys stay provider-level and are separate from runtime provider accounts.</p>
                      </div>
                      <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        {providers.filter((provider) => analyticsKeyProviders.has(provider.value)).map((provider) => {
                          const draft = draftForProvider(provider.value);
                          const analyticsCredential = analyticsCredentialForProvider(provider.value);
                          const analyticsKeyValue: SecretFieldValue = draft.analyticsApiKey || (analyticsCredential?.configured
                            ? { __botManagerSecret: true, configured: true, preview: analyticsCredential.keyPreview || "***" }
                            : "");
                          return (
                            <div key={provider.value} className="rounded-sm border border-border/70 bg-background/40 p-3">
                              <p className="font-heading text-sm text-foreground">{provider.label}</p>
                              <div className="mt-3 grid items-end gap-3 md:grid-cols-2">
                                <SecretField label="Analytics Key" value={analyticsKeyValue} onChange={(apiKey) => updateProviderDraft(provider.value, { analyticsApiKey: typeof apiKey === "string" ? apiKey : "" })} name={`bot-manager-${provider.value}-analytics-key`} placeholder="Enter admin analytics key" />
                                <Field label="Organization ID" value={draft.analyticsOrganizationId} onChange={(analyticsOrganizationId) => updateProviderDraft(provider.value, { analyticsOrganizationId })} placeholder="Optional" />
                                <Field label="Project ID" value={draft.analyticsProjectId} onChange={(analyticsProjectId) => updateProviderDraft(provider.value, { analyticsProjectId })} placeholder="Optional" />
                                <Button type="button" variant="outline" className="h-10 whitespace-nowrap" onClick={() => saveAnalyticsCredential(provider.value)} disabled={!canSubmitAnalyticsCredential(provider.value) || Boolean(busy)}>
                                  {busy === `analytics-credential-${provider.value}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                  Save Analytics
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}


          {activeMainTab === "config" && (
          <div className={panelClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Settings className="h-4 w-4" />
                <h2 className="font-heading text-sm uppercase tracking-[0.14em]">General Config</h2>
              </div>
              {generalDraftDirty && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Unsaved local draft</Badge>
                  <Button type="button" variant="outline" size="sm" onClick={resetGeneralDraft} disabled={Boolean(busy)}>
                    <X className="mr-2 h-4 w-4" />
                    Reset Draft
                  </Button>
                </div>
              )}
            </div>

              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Runtime Mode</span>
                    <select className={inputClass} value={generalDraft.runtimeMode} onChange={(event) => updateGeneralDraft({ runtimeMode: event.target.value as GeneralConfigDraft["runtimeMode"] })}>
                      <option value="single-active-personality">Single active personality</option>
                      <option value="multi-active-personality">Multi active personality</option>
                    </select>
                  </label>
                  <Field label="Timezone" value={generalDraft.timezone} onChange={(timezone) => updateGeneralDraft({ timezone })} placeholder="Asia/Singapore" />
                </div>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">General Information</span>
                  <textarea
                    className={cn(inputClass, "min-h-28 resize-y")}
                    value={generalDraft.generalInformation}
                    onChange={(event) => updateGeneralDraft({ generalInformation: event.target.value })}
                    placeholder="Shared facts, context, or operating information for all personalities."
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Global Rules</span>
                  <textarea className={cn(inputClass, "min-h-28 resize-y")} value={generalDraft.globalRules} onChange={(event) => updateGeneralDraft({ globalRules: event.target.value })} />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleControl
                    label="Default Restart After Sync"
                    description="Fallback restart behavior for personalities without their own override."
                    value={generalDraft.restartAfterSync}
                    onChange={(restartAfterSync) => updateGeneralDraft({ restartAfterSync })}
                  />
                  <ToggleControl
                    label="Allow Runtime Reload"
                    description="Lets Sync apply backend config and workspace changes to ZeroClaw runtimes."
                    value={generalDraft.allowRuntimeReload}
                    onChange={(allowRuntimeReload) => updateGeneralDraft({ allowRuntimeReload })}
                  />
                </div>
                <Button type="button" onClick={saveGeneralConfig} disabled={Boolean(busy)}>
                  <Save className="mr-2 h-4 w-4" />
                  Save General Config
                </Button>
                <RuntimeFreezeControl canManage={role === "author" && personnelLevel >= 7} />
              </div>
          </div>
          )}

          {activeMainTab === "personalities" && (
          <div className={panelClass}>
            <div className="flex items-center gap-2 text-primary">
              <Brain className="h-4 w-4" />
              <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Personalities</h2>
            </div>
              <div className="mt-4 space-y-4">

                <div className="grid gap-3 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      ref={personalitySearchRef}
                      id="bot-manager-personality-query"
                      name="bot-manager-personality-query"
                      type="search"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={cn(inputClass, "pl-9")}
                      value={personalitySearch}
                      onChange={(event) => updatePersonalitySearch(event.target.value)}
                      placeholder="Search personality"
                    />
                  </label>
                  <select className={inputClass} value={personalityFilter} onChange={(event) => { setPersonalityFilter(event.target.value); setPersonalityPage(1); }}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="missing-lore">Missing Lore</option>
                  </select>
                  <Button type="button" onClick={() => setShowCreatePersonality((current) => !current)}>
                    {showCreatePersonality ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    New Personality
                  </Button>
                </div>

                {showCreatePersonality && (
                  <div className="rounded-sm border border-border/70 bg-background/35 p-4">
                    <LorePicker
                      label="Lore Character (optional)"
                      options={createLoreOptions}
                      placeholder="Search character first or leave blank"
                      search={createLoreSearch}
                      selectedId={selectedCreateLore?.id ?? ""}
                      onSearchChange={updateCreateLoreSearch}
                      onSelect={selectCreateLore}
                    />
                    {selectedCreateLore && (
                      <SelectedCharacterPreview character={selectedCreateLore} onClear={clearCreateLore} />
                    )}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field label="Name" value={newName} onChange={setNewName} placeholder="Sola" />
                      <Field label="Role" value={newRole} onChange={setNewRole} placeholder="Morneven assistant" />
                    </div>
                    <label className="mt-3 block space-y-2">
                      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Description</span>
                      <textarea className={cn(inputClass, "min-h-24 resize-y")} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} />
                    </label>
                    <Button type="button" className="mt-3" onClick={createIdentity} disabled={!newName.trim() || !newRole.trim() || Boolean(busy)}>
                      Create
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {pagedPersonalities.map((identity) => {
                    const loreReference = asRecord(asRecord(identity.settings).loreReference);
                    const rowEditing = editingIdentityId === identity.id;
                    const rowLoaded = rowEditing && detail?.id === identity.id;
                    const identityAccountId = identity.runtimeProviderAccountId || identity.runtimeOpenRouterProfileId || "";
                    const identityAccountName = providerAccounts.find((account) => account.id === identityAccountId)?.name;
                    return (
                      <div key={identity.id} className={cn("rounded-sm border border-border/80 bg-background/25", selectedId === identity.id && "border-primary")}>
                        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                          <Profile identity={identity} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-heading text-base text-foreground">{identity.name}</h3>
                              {identity.isActive && <Badge><Check className="mr-1 h-3 w-3" />Active</Badge>}
                              {identity.isMain && <Badge variant="outline">Main</Badge>}
                              {identityAccountName && <Badge variant="outline">Account: {identityAccountName}</Badge>}
                              {readString(loreReference.id) ? <Badge variant="outline">Lore</Badge> : <Badge variant="destructive">No Lore</Badge>}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{identity.roleTitle}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{identity.description || "No description."}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant={identity.isActive ? "outline" : "default"}
                              className={identity.isActive ? "border-success/50 text-success" : undefined}
                              onClick={() => identity.isActive ? void deactivateIdentity(identity) : void activateIdentity(identity)}
                              disabled={Boolean(busy) || (identity.isActive && identity.isMain)}
                              title={identity.isActive ? "Deactivate personality" : `Activate ${identity.name}`}
                            >
                              {identity.isActive ? <Check className="mr-1.5 h-4 w-4" /> : <Power className="mr-1.5 h-4 w-4" />}
                              {identity.isActive ? "Active" : "Activate"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={identity.isMain ? "outline" : "secondary"}
                              onClick={() => makeMainIdentity(identity)}
                              disabled={Boolean(busy) || identity.isMain}
                              title={`Set ${identity.name} as main personality`}
                            >
                              Main
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={rowEditing ? "secondary" : "default"}
                              onClick={() => { setSelectedId(identity.id); setEditingIdentityId(rowEditing ? null : identity.id); }}
                              aria-expanded={rowEditing}
                            >
                              {rowEditing ? (
                                <>
                                  <ChevronUp className="mr-1.5 h-4 w-4" />
                                  Close config
                                </>
                              ) : (
                                <>
                                  <Settings className="mr-1.5 h-4 w-4" />
                                  Open config
                                </>
                              )}
                            </Button>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeIdentity(identity)} disabled={identity.isActive || identity.isMain || Boolean(busy)} title={identity.isActive || identity.isMain ? "Deactivate and remove main tag before deleting" : `Delete ${identity.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {rowEditing && (
                          <div className="border-t border-border/70 bg-background/40">
                            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <Settings className="h-3.5 w-3.5 text-primary" />
                                Configuring <span className="text-foreground normal-case tracking-normal">{identity.name}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingIdentityId(null)}
                                className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-2 py-1 text-[10px] tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                                Close
                              </button>
                            </div>
                            <div className="p-4">
                            {busy === "detail" || !rowLoaded ? (
                              <div className="flex min-h-40 items-center justify-center text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading personality config...
                              </div>
                            ) : (
                              <PersonalityEditor
                                activeTab={activeTab}
                                busy={busy}
                                canManageSchedules={role === "author" && personnelLevel >= 7}
                                channelsDraft={channelsDraft}
                                cronFiles={cronFiles}
                                defaultRegenerateConfirm={defaultRegenerateConfirm}
                                defaultRegenerateMode={defaultRegenerateMode}
                                detail={detail}
                                fileDraft={fileDraft}
                                identityDraft={identityDraft}
                                loreOptions={loreOptions}
                                loreSearch={loreSearch}
                                memoryFiles={memoryFiles}
                                onChannelSelect={setSelectedChannel}
                                onChannelUpdate={updateChannel}
                                onFileDelete={removeFile}
                                onFileDraftChange={setFileDraft}
                                onIdentityChange={(patch) => setIdentityDraft((current) => ({ ...current, ...patch }))}
                                onLoreSearchChange={setLoreSearch}
                                onLoreSelect={(character) => { setSelectedLoreId(character.id); setLoreSearch(formatCharacterLabel(character)); }}
                                providerAccounts={providerAccounts}
                                onRegenerateConfirmChange={setDefaultRegenerateConfirm}
                                onRegenerateDefaults={regenerateDefaults}
                                onRegenerateModeChange={setDefaultRegenerateMode}
                                onSaveChannels={saveIdentity}
                                onSaveFile={saveFile}
                                onSaveIdentity={saveIdentity}
                                onSettingsChange={updateSettingsDraft}
                                onTabChange={(tab) => {
                                  setActiveTab(tab);
                                  if (tab === "files") setFileDraft(workspaceFiles[0] ?? { ...emptyFile(), kind: "identity", path: "SOUL.md" });
                                  if (tab === "memory") setFileDraft(memoryFiles[0] ?? { ...emptyFile(), kind: "memory", path: "MEMORY.md" });
                                  if (tab === "cron") setFileDraft(cronFiles[0] ?? { ...emptyFile(), kind: "cron", path: "cron/new-task.md" });
                                  if (tab === "sessions") setFileDraft(sessionFiles[0] ?? { ...emptyFile(), kind: "session", path: "sessions/session-notes.md" });
                                }}
                                onUploadProfile={uploadProfile}
                                selectedChannel={selectedChannel}
                                selectedLoreId={selectedLoreId}
                                sessionFiles={sessionFiles}
                                settingsDraft={settingsDraft}
                                syncLog={syncLog}
                                workspaceFiles={workspaceFiles}
                              />
                            )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {pagedPersonalities.length === 0 && (
                    <div className="rounded-sm border border-border/70 bg-background/35 p-6 text-center">
                      <p className="font-heading text-sm text-foreground">No personalities match this search.</p>
                      <p className="mt-1 text-sm text-muted-foreground">Clear the query or adjust the filter to show saved personalities.</p>
                      {personalitySearch.trim() && (
                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { setPersonalitySearch(""); setPersonalityPage(1); }}>
                          <X className="mr-2 h-4 w-4" />
                          Clear search
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <PaginationControls page={personalityPage} totalPages={personalityTotalPages} onPageChange={setPersonalityPage} />
              </div>
          </div>
          )}

          {activeMainTab === "backups" && (
          <BackupSection
            backupCanCreate={backupCanCreate}
            backupCanImport={backupCanImport}
            backupConfirm={backupConfirm}
            backupHistoryMode={backupHistoryMode}
            backupImportConfirm={backupImportConfirm}
            backupImportFile={backupImportFile}
            backupImportKey={backupImportKey}
            backupImportPassword={backupImportPassword}
            backupJobs={backupJobs}
            backupKey={backupKey}
            backupMode={backupMode}
            backupPage={backupPage}
            backupPassword={backupPassword}
            backupSelectedIds={backupSelectedIds}
            backupStatus={backupStatus}
            backupTotalPages={backupTotalPages}
            busy={busy}
            collapsed={false}
            identities={summary?.identities ?? []}
            onClearAll={() => clearBackups()}
            onClearJob={(job) => clearBackups([job.id])}
            onConfirmChange={setBackupConfirm}
            onCreate={createBackup}
            onDownload={downloadBackup}
            onHistoryModeChange={(value) => { setBackupHistoryMode(value); setBackupPage(1); }}
            onImport={() => { void importBackup(); }}
            onImportConfirmChange={setBackupImportConfirm}
            onImportFileChange={setBackupImportFile}
            onImportKeyChange={setBackupImportKey}
            onImportPasswordChange={setBackupImportPassword}
            onKeyChange={setBackupKey}
            onModeChange={setBackupMode}
            onPageChange={setBackupPage}
            onPasswordChange={setBackupPassword}
            onSelectedChange={setBackupSelectedIds}
            onStatusChange={(value) => { setBackupStatus(value); setBackupPage(1); }}
            onToggle={() => undefined}
          />
          )}
        </div>

        </>
        )}
      </div>
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.max(page - 1, 1))} disabled={page <= 1}>
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.min(page + 1, totalPages))} disabled={page >= totalPages}>
        Next
      </Button>
    </div>
  );
}

function LineNumberedTextarea({
  value,
  onChange,
  readOnly = false,
  minHeightClass = "min-h-96",
  ariaLabel,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  minHeightClass?: string;
  ariaLabel: string;
}) {
  const gutterRef = useRef<HTMLPreElement>(null);
  const lineCount = useMemo(() => Math.max(value.split(/\r\n|\r|\n/).length, 1), [value]);
  const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, index) => index + 1).join("\n"), [lineCount]);
  const gutterWidth = `${Math.max(3.25, String(lineCount).length * 0.65 + 2.35)}rem`;

  const syncGutterScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
  };

  const updateValue = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!readOnly) onChange?.(event.target.value);
  };

  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-sm border border-border bg-background focus-within:ring-1 focus-within:ring-primary",
        readOnly && "opacity-90",
      )}
      style={{ gridTemplateColumns: `${gutterWidth} minmax(0, 1fr)` }}
    >
      <pre
        ref={gutterRef}
        aria-hidden="true"
        className={cn(
          minHeightClass,
          "pointer-events-none select-none overflow-hidden border-r border-border/70 bg-muted/25 px-3 py-2.5 text-right font-mono text-xs leading-5 text-muted-foreground",
        )}
      >
        {lineNumbers}
      </pre>
      <textarea
        aria-label={ariaLabel}
        aria-readonly={readOnly}
        className={cn(
          minHeightClass,
          "w-full resize-y border-0 bg-transparent px-3 py-2.5 font-mono text-xs leading-5 text-foreground outline-none placeholder:text-muted-foreground/75",
          readOnly && "cursor-not-allowed opacity-75",
        )}
        readOnly={readOnly}
        spellCheck={false}
        value={value}
        wrap="off"
        onChange={updateValue}
        onScroll={syncGutterScroll}
      />
    </div>
  );
}

function LorePicker({
  className,
  label = "Lore Character",
  options,
  placeholder = "Search lore character",
  search,
  selectedId,
  onSearchChange,
  onSelect,
}: {
  className?: string;
  label?: string;
  options: Character[];
  placeholder?: string;
  search: string;
  selectedId: string;
  onSearchChange: (value: string) => void;
  onSelect: (character: Character) => void;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input className={cn(inputClass, "pl-9")} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} />
      </div>
      {options.length > 0 && (
        <div className="max-h-44 overflow-y-auto rounded-sm border border-border bg-background">
          {options.map((character) => (
            <button
              key={character.id}
              type="button"
              className={cn("flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-primary/10", selectedId === character.id && "bg-primary/15 text-primary")}
              onClick={() => onSelect(character)}
            >
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-primary/10">
                {characterProfileImage(character) ? (
                  <AuthenticatedImage src={characterProfileImage(character)} alt={character.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-xs text-primary">{character.name.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{formatCharacterLabel(character)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedCharacterPreview({ character, onClear }: { character: Character; onClear: () => void }) {
  const traits = Array.isArray(character.traits) ? character.traits : [];
  const traitText = traits.length ? traits.slice(0, 4).join(", ") : "No traits";
  const anecdotes = Array.isArray(character.anecdotes) ? character.anecdotes.slice(0, 2) : [];
  const profileSrc = characterProfileImage(character);
  return (
    <div className="mt-3 rounded-sm border border-primary/50 bg-primary/10 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-background">
          {profileSrc ? (
            <AuthenticatedImage src={profileSrc} alt={character.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-primary">{character.name.slice(0, 1).toUpperCase()}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-heading text-sm text-foreground">{character.name}</p>
              <p className="text-xs text-muted-foreground">{character.race}{character.occupation ? ` / ${character.occupation}` : ""}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onClear}>
              Clear Character
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{traitText}</p>
          <p className="mt-2 line-clamp-3 text-sm text-foreground/80">{character.shortDesc || "No short description."}</p>
          {anecdotes.length > 0 && (
            <div className="mt-3 space-y-1 rounded-sm border border-border/70 bg-background/40 p-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Anecdotes</p>
              {anecdotes.map((anecdote) => (
                <p key={anecdote.id} className="line-clamp-2 text-xs text-foreground/80">
                  <span className="font-heading text-foreground">{anecdote.title}</span>
                  {anecdote.body ? ` - ${anecdote.body}` : ""}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderAccountsSection({
  accounts,
  activeProvider,
  activeProviderAccountId,
  busy,
  canUseCredentialGate,
  draft,
  filter,
  onActivate,
  onDelete,
  onDraftChange,
  onFilterChange,
  onProviderChange,
  onSave,
  onSearchChange,
  providers,
  search,
  selectedProvider,
}: {
  accounts: BotProviderAccount[];
  activeProvider: string;
  activeProviderAccountId: string;
  busy: string | null;
  canUseCredentialGate: boolean;
  draft: ProviderAccountDraft;
  filter: string;
  onActivate: (account: BotProviderAccount) => void;
  onDelete: (account: BotProviderAccount) => void;
  onDraftChange: (draft: ProviderAccountDraft) => void;
  onFilterChange: (value: string) => void;
  onProviderChange: (provider: BotProvider) => void;
  onSave: () => void;
  onSearchChange: (value: string) => void;
  providers: Array<{ value: BotProvider; label: string }>;
  search: string;
  selectedProvider: BotProvider;
}) {
  const visibleAccounts = accounts.filter((account) => {
    if (account.provider !== selectedProvider) return false;
    const matchesSearch = !search.trim() || `${account.name} ${account.modelId} ${account.tags.join(" ")} ${account.notes}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter = filter === "all" || (filter === "active" && account.isActive) || (filter === "complete" && account.configured && Boolean(account.modelId)) || (filter === "incomplete" && (!account.configured || !account.modelId));
    return matchesSearch && matchesFilter;
  });
  const providerLabel = providers.find((provider) => provider.value === selectedProvider)?.label ?? selectedProvider;

  return (
    <div className="rounded-sm border border-border/70 bg-background/35 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-heading text-base text-foreground">Provider accounts</h3>
          <p className="text-xs text-muted-foreground">Named runtime accounts. Each provider has one default active account; personalities can override it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className={cn(inputClass, "h-9 w-48 py-1.5")} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search accounts" />
          <select className={cn(inputClass, "h-9 w-36 py-1.5")} value={filter} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {providers.map((provider) => {
          const providerAccounts = accounts.filter((account) => account.provider === provider.value);
          const active = providerAccounts.find((account) => account.isActive);
          return (
            <button key={provider.value} type="button" onClick={() => onProviderChange(provider.value)} className={cn("rounded-sm border p-3 text-left", selectedProvider === provider.value ? "border-primary bg-primary/10" : "border-border/70 bg-background/40 hover:border-primary/60")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm text-foreground">{provider.label}</span>
                {activeProvider === provider.value && <Badge className="text-[10px]">Runtime</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{providerAccounts.length} account{providerAccounts.length === 1 ? "" : "s"}</p>
              <p className="truncate text-xs text-muted-foreground">Default: {active?.name ?? "not set"}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-heading text-sm text-foreground">{providerLabel} accounts</h4>
          <Badge variant="outline">{visibleAccounts.length}</Badge>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onProviderChange(selectedProvider)} disabled={Boolean(busy)}>
          <Plus className="mr-2 h-4 w-4" />
          New account
        </Button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {visibleAccounts.map((account) => {
          const isActive = account.isActive || activeProviderAccountId === account.id;
          return (
            <div key={account.id} className={cn("rounded-sm border border-border/70 bg-card/60 p-3", isActive && "border-primary")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm text-foreground">{account.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{account.keyPreview} / {account.modelId}</p>
                  {account.tags.length > 0 && <p className="mt-1 truncate text-xs text-muted-foreground">{account.tags.join(", ")}</p>}
                </div>
                {isActive && <Badge>Default</Badge>}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Button type="button" size="sm" variant="outline" onClick={() => onDraftChange({ id: account.id, provider: account.provider as BotProvider, name: account.name, apiKey: "", keyPreview: account.keyPreview, apiBase: account.apiBase, modelId: account.modelId, tags: account.tags, notes: account.notes })}>
                  <Pencil className="mr-2 h-4 w-4" />Edit
                </Button>
                <Button type="button" size="sm" onClick={() => onActivate(account)} disabled={!canUseCredentialGate || isActive || Boolean(busy)}>
                  <Power className="mr-2 h-4 w-4" />{isActive ? "Default" : "Activate"}
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(account)} disabled={!canUseCredentialGate || isActive || Boolean(busy)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {visibleAccounts.length === 0 && <p className="rounded-sm border border-dashed border-border/70 p-4 text-sm text-muted-foreground lg:col-span-2">No accounts for {providerLabel} yet.</p>}
      </div>

      <div className="mt-4 rounded-sm border border-border/70 bg-background/40 p-3">
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Account Name" value={draft.name} onChange={(name) => onDraftChange({ ...draft, name })} placeholder={`${providerLabel} default`} />
          <Field label="Model ID" value={draft.modelId} onChange={(modelId) => onDraftChange({ ...draft, modelId })} placeholder={defaultModelIds[selectedProvider] ?? "model-id"} />
          <Field label="API Base" value={draft.apiBase} onChange={(apiBase) => onDraftChange({ ...draft, apiBase })} placeholder="Optional provider base URL" />
        </div>
        <div className="mt-4 grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <TagField label="Tags" value={draft.tags} onChange={(tags) => onDraftChange({ ...draft, tags })} placeholder="production, reasoning" />
          <Field label="Notes" value={draft.notes} onChange={(notes) => onDraftChange({ ...draft, notes })} />
          <Button type="button" className="h-10 whitespace-nowrap" onClick={onSave} disabled={!draft.name.trim() || (!draft.id && !draft.apiKey.trim()) || !draft.modelId.trim() || !canUseCredentialGate || Boolean(busy)}>
            <Save className="mr-2 h-4 w-4" />
            {draft.id ? "Update account" : "Create account"}
          </Button>
        </div>
        <div className="mt-4">
          <SecretField label="API Key / Token" value={draft.apiKey || (draft.id && draft.keyPreview ? { __botManagerSecret: true, configured: true, preview: draft.keyPreview } : "")} onChange={(apiKey) => onDraftChange({ ...draft, apiKey: typeof apiKey === "string" ? apiKey : "" })} name={`bot-manager-${selectedProvider}-account-api-key`} placeholder="Enter provider API key or token" />
        </div>
        {draft.id && <div className="mt-3 flex justify-end"><Button type="button" variant="outline" onClick={() => onProviderChange(selectedProvider)}>Cancel</Button></div>}
      </div>
    </div>
  );
}

function OpenRouterSection({
  activeProfileId,
  busy,
  canUseCredentialGate,
  draft,
  filter,
  onActivate,
  onDelete,
  onDraftChange,
  onFilterChange,
  onPageChange,
  onSave,
  onSearchChange,
  page,
  profiles,
  search,
  totalPages,
}: {
  activeProfileId: string;
  busy: string | null;
  canUseCredentialGate: boolean;
  draft: OpenRouterDraft;
  filter: string;
  onActivate: (profile: OpenRouterProfile) => void;
  onDelete: (profile: OpenRouterProfile) => void;
  onDraftChange: (draft: OpenRouterDraft) => void;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSave: () => void;
  onSearchChange: (value: string) => void;
  page: number;
  profiles: OpenRouterProfile[];
  search: string;
  totalPages: number;
}) {
  return (
    <div className="rounded-sm border border-border/70 bg-background/35 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-heading text-base text-foreground">OpenRouter Custom Provider</h3>
          <p className="text-xs text-muted-foreground">Multiple OpenRouter profiles, one active at runtime.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputClass} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search profiles" />
          <select className={inputClass} value={filter} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">All</option>
            <option value="active">Runtime Active</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {profiles.map((profile) => {
          const isActive = activeProfileId === profile.id || profile.isActive;
          return (
            <div key={profile.id} className={cn("rounded-sm border border-border/70 bg-card/60 p-3", isActive && "border-primary")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm text-foreground">{profile.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{profile.keyPreview} / {profile.modelId}</p>
                  {profile.tags.length > 0 && <p className="mt-1 truncate text-xs text-muted-foreground">{profile.tags.join(", ")}</p>}
                </div>
                {isActive && <Badge>Active</Badge>}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Button type="button" size="sm" variant="outline" onClick={() => onDraftChange({ id: profile.id, name: profile.name, apiKey: "", keyPreview: profile.keyPreview, apiBase: profile.apiBase, modelId: profile.modelId, tags: profile.tags, notes: profile.notes })}>
                  Edit
                </Button>
                <Button type="button" size="sm" onClick={() => onActivate(profile)} disabled={!canUseCredentialGate || isActive || Boolean(busy)}>
                  Enable
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(profile)} disabled={!canUseCredentialGate || isActive || Boolean(busy)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      <div className="mt-4 rounded-sm border border-border/70 bg-background/40 p-3">
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Profile Name" value={draft.name} onChange={(name) => onDraftChange({ ...draft, name })} placeholder="OpenRouter DeepSeek" />
          <Field label="Model ID" value={draft.modelId} onChange={(modelId) => onDraftChange({ ...draft, modelId })} placeholder="deepseek/deepseek-chat-v3" />
          <Field label="API Base" value={draft.apiBase} onChange={(apiBase) => onDraftChange({ ...draft, apiBase })} placeholder="https://openrouter.ai/api/v1" />
        </div>
        <div className="mt-4 grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <TagField label="Tags" value={draft.tags} onChange={(tags) => onDraftChange({ ...draft, tags })} placeholder="reasoning, production" />
          <Field label="Notes" value={draft.notes} onChange={(notes) => onDraftChange({ ...draft, notes })} />
          <Button type="button" className="h-10 whitespace-nowrap" onClick={onSave} disabled={!draft.name.trim() || (!draft.id && !draft.apiKey.trim()) || !draft.modelId.trim() || !canUseCredentialGate || Boolean(busy)}>
            <Save className="mr-2 h-4 w-4" />
            {draft.id ? "Update OpenRouter Profile" : "Create OpenRouter Profile"}
          </Button>
        </div>
        <div className="mt-4">
          <SecretField
            label="API Key"
            value={draft.apiKey || (draft.id && draft.keyPreview ? { __botManagerSecret: true, configured: true, preview: draft.keyPreview } : "")}
            onChange={(apiKey) => onDraftChange({ ...draft, apiKey: typeof apiKey === "string" ? apiKey : "" })}
            name="bot-manager-openrouter-api-key"
            placeholder="Enter OpenRouter API key"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {draft.id && (
            <Button type="button" variant="outline" onClick={() => onDraftChange({ name: "", apiKey: "", apiBase: "", modelId: "", tags: [], notes: "" })}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonalityEditor({
  activeTab,
  busy,
  canManageSchedules,
  channelsDraft,
  cronFiles,
  defaultRegenerateConfirm,
  defaultRegenerateMode,
  detail,
  fileDraft,
  identityDraft,
  loreOptions,
  loreSearch,
  memoryFiles,
  onChannelSelect,
  onChannelUpdate,
  onFileDelete,
  onFileDraftChange,
  onIdentityChange,
  onLoreSearchChange,
  onLoreSelect,
  providerAccounts,
  onRegenerateConfirmChange,
  onRegenerateDefaults,
  onRegenerateModeChange,
  onSaveChannels,
  onSaveFile,
  onSaveIdentity,
  onSettingsChange,
  onTabChange,
  onUploadProfile,
  selectedChannel,
  selectedLoreId,
  sessionFiles,
  settingsDraft,
  syncLog,
  workspaceFiles,
}: {
  activeTab: BotTab;
  busy: string | null;
  canManageSchedules: boolean;
  channelsDraft: JsonRecord;
  cronFiles: BotIdentityFile[];
  defaultRegenerateConfirm: string;
  defaultRegenerateMode: "safe" | "force";
  detail: BotIdentityDetail | null;
  fileDraft: BotIdentityFile;
  identityDraft: BotIdentityDraft;
  loreOptions: Character[];
  loreSearch: string;
  memoryFiles: BotIdentityFile[];
  onChannelSelect: (channel: ChannelKey) => void;
  onChannelUpdate: (channel: ChannelKey, patch: JsonRecord) => void;
  onFileDelete: () => void;
  onFileDraftChange: (file: BotIdentityFile) => void;
  onIdentityChange: (patch: Partial<BotIdentityDraft>) => void;
  onLoreSearchChange: (value: string) => void;
  onLoreSelect: (character: Character) => void;
  providerAccounts: BotProviderAccount[];
  onRegenerateConfirmChange: (value: string) => void;
  onRegenerateDefaults: () => void;
  onRegenerateModeChange: (value: "safe" | "force") => void;
  onSaveChannels: () => void;
  onSaveFile: () => void;
  onSaveIdentity: () => void;
  onSettingsChange: (patch: Partial<BotSettingsDraft>) => void;
  onTabChange: (tab: BotTab) => void;
  onUploadProfile: (file: File) => void;
  selectedChannel: ChannelKey;
  selectedLoreId: string;
  sessionFiles: BotIdentityFile[];
  settingsDraft: BotSettingsDraft;
  syncLog: string;
  workspaceFiles: BotIdentityFile[];
}) {
  if (!detail) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Profile identity={detail} large />
          <div>
            <h2 className="font-heading text-xl text-foreground">{detail.name}</h2>
            <p className="text-sm text-muted-foreground">{detail.roleTitle}</p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          Profile
          <input type="file" accept="image/*" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUploadProfile(file);
            event.currentTarget.value = "";
          }} />
        </label>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn("shrink-0 rounded-sm border px-2.5 py-1.5 text-[11px] font-heading uppercase tracking-[0.12em] sm:px-3 sm:py-2 sm:text-xs", activeTab === tab ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === "channels" && <ChannelEditor activeChannel={selectedChannel} busy={Boolean(busy)} channels={channelsDraft} identityId={detail.id} onSave={onSaveChannels} onSelect={onChannelSelect} onUpdate={onChannelUpdate} />}
      {activeTab === "system" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Metric label="Runtime Mode" value="Single active personality" />
          <Metric label="Current Active" value={detail.isActive ? "Yes" : "No"} />
          <Metric label="Workspace Files" value={String(detail.files.length)} />
          <Metric label="Memory Files" value={String(memoryFiles.length)} />
          <Metric label="Cron Files" value={String(cronFiles.length)} />
          <Metric label="Session Files" value={String(sessionFiles.length)} />
        </div>
      )}
      {activeTab === "files" && <FileEditor files={workspaceFiles} fileDraft={fileDraft} setFileDraft={onFileDraftChange} onSave={onSaveFile} onDelete={onFileDelete} busy={busy === "file"} allowedKinds={fileKinds.filter((kind) => kind !== "memory" && kind !== "cron" && kind !== "session")} />}
      {activeTab === "memory" && <FileEditor files={memoryFiles} fileDraft={fileDraft} setFileDraft={onFileDraftChange} onSave={onSaveFile} onDelete={onFileDelete} busy={busy === "file"} defaultKind="memory" newFilePath="memory/note.md" allowedKinds={["memory"]} />}
      {activeTab === "cron" && <FileEditor files={cronFiles} fileDraft={fileDraft} setFileDraft={onFileDraftChange} onSave={onSaveFile} onDelete={onFileDelete} busy={busy === "file"} defaultKind="cron" newFilePath="cron/new-task.md" allowedKinds={["cron"]} />}
      {activeTab === "sessions" && <FileEditor files={sessionFiles} fileDraft={fileDraft} setFileDraft={onFileDraftChange} onSave={onSaveFile} onDelete={onFileDelete} busy={busy === "file"} defaultKind="session" newFilePath="sessions/session-notes.md" allowedKinds={["session"]} />}
      {activeTab === "settings" && (
        <div className="space-y-4">
          <SettingsEditor
            busy={Boolean(busy)}
            canManageSchedules={canManageSchedules}
            identityId={detail.id}
            identityDraft={identityDraft}
            providerAccounts={providerAccounts}
            settingsDraft={settingsDraft}
            onIdentityChange={onIdentityChange}
            onSave={onSaveIdentity}
            onSettingsChange={onSettingsChange}
          />
          <LorePicker options={loreOptions} search={loreSearch} selectedId={selectedLoreId} onSearchChange={onLoreSearchChange} onSelect={onLoreSelect} />
          <DefaultFilesRegenerator
            busy={busy === "default-files"}
            confirm={defaultRegenerateConfirm}
            mode={defaultRegenerateMode}
            onConfirmChange={onRegenerateConfirmChange}
            onModeChange={onRegenerateModeChange}
            onRegenerate={onRegenerateDefaults}
          />
        </div>
      )}
      {activeTab === "logs" && (
        <LineNumberedTextarea
          ariaLabel="Bot Manager sync log"
          minHeightClass="min-h-40"
          readOnly
          value={syncLog || "No sync response yet."}
        />
      )}
    </div>
  );
}

function BackupSection({
  backupCanCreate,
  backupCanImport,
  backupConfirm,
  backupHistoryMode,
  backupImportConfirm,
  backupImportFile,
  backupImportKey,
  backupImportPassword,
  backupJobs,
  backupKey,
  backupMode,
  backupPage,
  backupPassword,
  backupSelectedIds,
  backupStatus,
  backupTotalPages,
  busy,
  collapsed,
  identities,
  onClearAll,
  onClearJob,
  onConfirmChange,
  onCreate,
  onDownload,
  onHistoryModeChange,
  onImport,
  onImportConfirmChange,
  onImportFileChange,
  onImportKeyChange,
  onImportPasswordChange,
  onKeyChange,
  onModeChange,
  onPageChange,
  onPasswordChange,
  onSelectedChange,
  onStatusChange,
  onToggle,
}: {
  backupCanCreate: boolean;
  backupCanImport: boolean;
  backupConfirm: string;
  backupHistoryMode: string;
  backupImportConfirm: string;
  backupImportFile: File | null;
  backupImportKey: string;
  backupImportPassword: string;
  backupJobs: BotManagerBackupJob[];
  backupKey: string;
  backupMode: "full" | "custom";
  backupPage: number;
  backupPassword: string;
  backupSelectedIds: string[];
  backupStatus: string;
  backupTotalPages: number;
  busy: string | null;
  collapsed: boolean;
  identities: BotIdentity[];
  onClearAll: () => void;
  onClearJob: (job: BotManagerBackupJob) => void;
  onConfirmChange: (value: string) => void;
  onCreate: () => void;
  onDownload: (job: BotManagerBackupJob) => void;
  onHistoryModeChange: (value: string) => void;
  onImport: () => void;
  onImportConfirmChange: (value: string) => void;
  onImportFileChange: (file: File | null) => void;
  onImportKeyChange: (value: string) => void;
  onImportPasswordChange: (value: string) => void;
  onKeyChange: (value: string) => void;
  onModeChange: (value: "full" | "custom") => void;
  onPageChange: (page: number) => void;
  onPasswordChange: (value: string) => void;
  onSelectedChange: (ids: string[]) => void;
  onStatusChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className={panelClass}>
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={onToggle}>
        <span className="flex items-center gap-2 text-primary">
          <Download className="h-4 w-4" />
          <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Backup</h2>
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>
      {!collapsed && (
        <div className="mt-4 space-y-5">
          <div className="rounded-sm border border-border/70 bg-background/35 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Mode</span>
                <select className={inputClass} value={backupMode} onChange={(event) => onModeChange(event.target.value as "full" | "custom")}>
                  <option value="full">Full backup</option>
                  <option value="custom">Custom backup</option>
                </select>
              </label>
              <Field label="Password" value={backupPassword} onChange={onPasswordChange} type="password" name="bot-manager-backup-password" />
              <Field label="Extraction Key" value={backupKey} onChange={onKeyChange} type="password" name="bot-manager-backup-extraction-key" />
            </div>
            <div className="mt-3 grid gap-3 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Field label="Confirmation" value={backupConfirm} onChange={onConfirmChange} placeholder='Type "PERSONALITY"' />
              <Button type="button" onClick={onCreate} disabled={!backupCanCreate || Boolean(busy)}>
                {busy === "backup-create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Generate Backup
              </Button>
            </div>
            {backupMode === "custom" && (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {identities.map((identity) => {
                  const selected = backupSelectedIds.includes(identity.id);
                  return (
                    <label key={identity.id} className="flex items-center gap-2 rounded-sm border border-border/70 bg-background/40 p-2 text-sm">
                      <input type="checkbox" checked={selected} onChange={(event) => {
                        onSelectedChange(event.target.checked ? [...backupSelectedIds, identity.id] : backupSelectedIds.filter((id) => id !== identity.id));
                      }} />
                      <span className="truncate">{identity.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-sm border border-border/70 bg-background/35 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Backup File</span>
                <input
                  key={backupImportFile?.name ?? "empty-import-file"}
                  className="sr-only"
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => onImportFileChange(event.target.files?.[0] ?? null)}
                />
                <span className={cn(inputClass, "flex h-[42px] cursor-pointer items-center gap-2 overflow-hidden")}>
                  <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className={cn("truncate", backupImportFile ? "text-foreground" : "text-muted-foreground/75")}>
                    {backupImportFile?.name ?? "Select backup ZIP"}
                  </span>
                </span>
              </label>
              <Field label="Password" value={backupImportPassword} onChange={onImportPasswordChange} type="password" name="bot-manager-backup-import-password" />
              <Field label="Extraction Key" value={backupImportKey} onChange={onImportKeyChange} type="password" name="bot-manager-backup-import-extraction-key" />
            </div>
            <div className="mt-3 grid gap-3 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Field label="Confirmation" value={backupImportConfirm} onChange={onImportConfirmChange} placeholder='Type "PERSONALITY"' />
              <Button type="button" onClick={onImport} disabled={!backupCanImport || Boolean(busy)}>
                {busy === "backup-import" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import Backup
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid gap-2 grid-cols-[minmax(0,1fr)] md:grid-cols-[12rem_12rem_1fr_auto] md:items-center">
              <select className={inputClass} value={backupStatus} onChange={(event) => onStatusChange(event.target.value)}>
                <option value="all">All status</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              <select className={inputClass} value={backupHistoryMode} onChange={(event) => onHistoryModeChange(event.target.value)}>
                <option value="all">All modes</option>
                <option value="full">Full</option>
                <option value="custom">Custom</option>
              </select>
              <div />
              <Button type="button" variant="destructive" onClick={onClearAll} disabled={Boolean(busy)}>
                Clear History
              </Button>
            </div>
            {backupJobs.map((job) => (
              <div key={job.id} className="grid gap-3 rounded-sm border border-border/70 bg-background/35 p-3 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_8rem_8rem_auto_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm text-foreground">{job.downloadName ?? job.id}</p>
                  <p className="text-xs text-muted-foreground">{job.progress?.message ?? job.status}</p>
                  {job.error && <p className="text-xs text-destructive">{job.error}</p>}
                </div>
                <Badge variant="outline">{job.mode}</Badge>
                <Badge variant={job.status === "failed" ? "destructive" : job.status === "completed" ? "default" : "outline"}>{job.status}</Badge>
                <Button type="button" variant="outline" size="sm" onClick={() => onDownload(job)} disabled={job.status !== "completed" || !backupKey || Boolean(busy)}>
                  Download
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => onClearJob(job)} disabled={Boolean(busy)}>
                  Clear
                </Button>
              </div>
            ))}
            <PaginationControls page={backupPage} totalPages={backupTotalPages} onPageChange={onPageChange} />
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelEditor({
  activeChannel,
  busy,
  channels,
  identityId,
  onSave,
  onSelect,
  onUpdate,
}: {
  activeChannel: ChannelKey;
  busy: boolean;
  channels: JsonRecord;
  identityId: string;
  onSave: () => void;
  onSelect: (channel: ChannelKey) => void;
  onUpdate: (channel: ChannelKey, patch: JsonRecord) => void;
}) {
  const config = asRecord(channels[activeChannel]);
  const currentTab = channelTabs.find((tab) => tab.key === activeChannel) ?? channelTabs[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {channelTabs.map((channel) => {
          const Icon = channel.icon;
          const channelConfig = asRecord(channels[channel.key]);
          const enabled = Boolean(channelConfig.enabled);
          return (
            <button
              key={channel.key}
              type="button"
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-sm border p-3 text-left",
                activeChannel === channel.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/35 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSelect(channel.key)}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-background">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-heading text-sm">{channel.label}</span>
                <span className="block truncate text-xs">{enabled ? "Enabled" : channel.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-sm border border-border/70 bg-background/35 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading text-base text-foreground">{currentTab.label}</h3>
            <p className="text-xs text-muted-foreground">{currentTab.detail}</p>
          </div>
          <ToggleControl
            label="Enabled"
            value={Boolean(config.enabled)}
            onChange={(enabled) => onUpdate(activeChannel, { enabled })}
          />
        </div>
        <div className="mt-4">
          <ChannelFields channel={activeChannel} config={config} identityId={identityId} onUpdate={(patch) => onUpdate(activeChannel, patch)} />
        </div>
      </div>

      <Button type="button" onClick={onSave} disabled={busy}>
        <Save className="mr-2 h-4 w-4" />
        Save Channels
      </Button>
    </div>
  );
}

function ChannelFields({
  channel,
  config,
  identityId,
  onUpdate,
}: {
  channel: ChannelKey;
  config: JsonRecord;
  identityId: string;
  onUpdate: (patch: JsonRecord) => void;
}) {
  const { toast } = useToast();
  const [topicBusy, setTopicBusy] = useState<string | null>(null);
  const [manualTopic, setManualTopic] = useState({ chatId: "", title: "", messageThreadId: "", topicTitle: "" });
  const topicLock = normalizeTelegramTopicLockClient(config.topicLock);
  const topicRegistry = normalizeTelegramTopicRegistryClient(config.topicRegistry);
  const applyTopicResponse = (response: TelegramTopicsResponse) => {
    onUpdate({ topicLock: response.topicLock, topicRegistry: response.topicRegistry });
  };
  const loadTopics = async () => {
    if (channel !== "telegram") return;
    setTopicBusy("load");
    try {
      applyTopicResponse(await getTelegramTopics(identityId));
    } catch (err) {
      toast({ title: "Topic Lock unavailable", description: err instanceof Error ? err.message : "Unable to load Telegram topics." });
    } finally {
      setTopicBusy(null);
    }
  };
  const saveTopicLock = async (nextLock: TelegramTopicLock) => {
    setTopicBusy("save");
    try {
      applyTopicResponse(await updateTelegramTopicLock(identityId, nextLock));
      toast({ title: "Topic Lock saved" });
    } catch (err) {
      toast({ title: "Topic Lock save failed", description: err instanceof Error ? err.message : "Unable to save Topic Lock." });
    } finally {
      setTopicBusy(null);
    }
  };
  const refreshTopics = async () => {
    setTopicBusy("refresh");
    try {
      applyTopicResponse(await refreshTelegramTopics(identityId));
      toast({ title: "Telegram topics refreshed" });
    } catch (err) {
      toast({ title: "Telegram topic refresh failed", description: err instanceof Error ? err.message : "Runtime unavailable or no topics observed yet." });
    } finally {
      setTopicBusy(null);
    }
  };
  const addManualTopic = async () => {
    if (!manualTopic.chatId.trim()) return;
    setTopicBusy("manual");
    try {
      applyTopicResponse(await addTelegramTopicManual(identityId, {
        chatId: manualTopic.chatId.trim(),
        title: manualTopic.title.trim(),
        messageThreadId: manualTopic.messageThreadId.trim() || undefined,
        topicTitle: manualTopic.topicTitle.trim(),
      }));
      setManualTopic({ chatId: "", title: "", messageThreadId: "", topicTitle: "" });
      toast({ title: "Telegram topic added" });
    } catch (err) {
      toast({ title: "Manual topic add failed", description: err instanceof Error ? err.message : "Unable to add Telegram topic." });
    } finally {
      setTopicBusy(null);
    }
  };
  const renameTopic = async (payload: { chatId: string; title: string; messageThreadId: string; topicTitle: string }) => {
    setTopicBusy("rename");
    try {
      applyTopicResponse(await addTelegramTopicManual(identityId, payload));
      toast({ title: "Telegram topic title saved" });
    } catch (err) {
      toast({ title: "Topic title save failed", description: err instanceof Error ? err.message : "Unable to save Telegram topic title." });
    } finally {
      setTopicBusy(null);
    }
  };
  useEffect(() => {
    if (channel === "telegram") void loadTopics();
  }, [channel, identityId]);

  if (channel === "telegram") {
    return (
      <div className="space-y-4">
        <div className="grid items-start gap-3 md:grid-cols-2">
          <div className="space-y-3">
            <SecretField label="Token" value={config.token} onChange={(token) => onUpdate({ token })} name="bot-manager-telegram-token" placeholder="Enter Telegram bot token" />
            <Field label="Proxy" value={readString(config.proxy)} onChange={(proxy) => onUpdate({ proxy })} placeholder="Optional proxy URL" />
          </div>
          <div>
            <TagField label="Allowed User IDs" value={readStringArray(config.allowFrom)} onChange={(allowFrom) => onUpdate({ allowFrom })} placeholder="* or user ID" />
          </div>
        </div>
        <TelegramTopicLockPanel
          busy={Boolean(topicBusy)}
          lock={topicLock}
          registry={topicRegistry}
          manualTopic={manualTopic}
          onAddManual={addManualTopic}
          onManualChange={setManualTopic}
          onRenameTopic={renameTopic}
          onRefresh={refreshTopics}
          onSave={saveTopicLock}
        />
      </div>
    );
  }

  if (channel === "whatsapp") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Bridge URL" value={readString(config.bridgeUrl, "ws://localhost:3001")} onChange={(bridgeUrl) => onUpdate({ bridgeUrl })} />
        <TagField label="Allowed Numbers" value={readStringArray(config.allowFrom)} onChange={(allowFrom) => onUpdate({ allowFrom })} />
      </div>
    );
  }

  if (channel === "discord") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SecretField label="Bot Token" value={config.token} onChange={(token) => onUpdate({ token })} name="bot-manager-discord-token" />
        <Field label="Application ID" value={readString(config.applicationId)} onChange={(applicationId) => onUpdate({ applicationId })} />
        <TagField label="Guild IDs" value={readStringArray(config.guildIds)} onChange={(guildIds) => onUpdate({ guildIds })} />
        <TagField label="Channel IDs" value={readStringArray(config.channelIds)} onChange={(channelIds) => onUpdate({ channelIds })} />
      </div>
    );
  }

  if (channel === "slack") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SecretField label="Bot Token" value={config.botToken} onChange={(botToken) => onUpdate({ botToken })} name="bot-manager-slack-bot-token" />
        <SecretField label="App Token" value={config.appToken} onChange={(appToken) => onUpdate({ appToken })} name="bot-manager-slack-app-token" />
        <SecretField label="Signing Secret" value={config.signingSecret} onChange={(signingSecret) => onUpdate({ signingSecret })} name="bot-manager-slack-signing-secret" />
        <TagField label="Channel IDs" value={readStringArray(config.channelIds)} onChange={(channelIds) => onUpdate({ channelIds })} />
      </div>
    );
  }

  if (channel === "feishu") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="App ID" value={readString(config.appId)} onChange={(appId) => onUpdate({ appId })} />
        <SecretField label="App Secret" value={config.appSecret} onChange={(appSecret) => onUpdate({ appSecret })} name="bot-manager-feishu-app-secret" />
        <SecretField label="Verification Token" value={config.verificationToken} onChange={(verificationToken) => onUpdate({ verificationToken })} name="bot-manager-feishu-verification-token" />
        <SecretField label="Encrypt Key" value={config.encryptKey} onChange={(encryptKey) => onUpdate({ encryptKey })} name="bot-manager-feishu-encrypt-key" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SecretField label="Webhook URL" value={config.webhookUrl} onChange={(webhookUrl) => onUpdate({ webhookUrl })} name="bot-manager-dingtalk-webhook-url" />
      <SecretField label="Secret" value={config.secret} onChange={(secret) => onUpdate({ secret })} name="bot-manager-dingtalk-secret" />
      <TagField label="Allowed Senders" value={readStringArray(config.allowFrom)} onChange={(allowFrom) => onUpdate({ allowFrom })} />
    </div>
  );
}

function normalizeTelegramTopicIdClient(value: unknown) {
  if (value === undefined || value === null || value === "") return "main";
  const text = String(value).trim();
  if (!text || text === "0" || text === "1" || text.toLowerCase() === "main") return "main";
  return text;
}

function normalizeTelegramTopicLockClient(value: unknown): TelegramTopicLock {
  const record = asRecord(value);
  const groups = Array.isArray(record.groups) ? record.groups : [];
  const normalizedGroups = groups.map((entry) => {
    const group = asRecord(entry);
    const allowedTopicIds = Array.isArray(group.allowedTopicIds)
      ? group.allowedTopicIds.map(normalizeTelegramTopicIdClient).filter((topicId) => topicId !== "main")
      : [];
    const allowMainTopic = typeof group.allowMainTopic === "boolean" ? group.allowMainTopic : true;
    const rawPrimaryTopicId = normalizeTelegramTopicIdClient(group.primaryTopicId);
    const allowedTopicSet = new Set(allowedTopicIds);
    const primaryTopicAllowed = rawPrimaryTopicId === "main" ? allowMainTopic : allowedTopicSet.has(rawPrimaryTopicId);
    const primaryTopicId = primaryTopicAllowed ? rawPrimaryTopicId : allowedTopicIds[0] ?? (allowMainTopic ? "main" : "");
    return {
      chatId: readString(group.chatId),
      title: readString(group.title),
      isForum: typeof group.isForum === "boolean" ? group.isForum : true,
      allowedTopicIds: Array.from(new Set(allowedTopicIds)),
      allowMainTopic,
      primaryTopicId,
      updatedAt: readString(group.updatedAt) || new Date().toISOString(),
    };
  }).filter((group) => group.chatId);
  const hasGroupRules = normalizedGroups.some((group) =>
    group.allowMainTopic === false ||
    group.allowedTopicIds.length > 0 ||
    Boolean(group.primaryTopicId && group.primaryTopicId !== "main")
  );
  return {
    enabled: record.enabled === true || hasGroupRules,
    defaultPolicy: "allow",
    groups: normalizedGroups,
  };
}

function normalizeTelegramTopicRegistryClient(value: unknown) {
  const record = asRecord(value);
  const groups = Array.isArray(record.groups) ? record.groups : [];
  return {
    groups: groups.map((entry) => {
      const group = asRecord(entry);
      const topics = Array.isArray(group.topics) ? group.topics : [];
      return {
        chatId: readString(group.chatId),
        title: readString(group.title),
        isForum: typeof group.isForum === "boolean" ? group.isForum : true,
        lastSeenAt: readString(group.lastSeenAt),
        source: readString(group.source) === "manual" ? "manual" as const : "observed" as const,
        topics: topics.map((topicEntry) => {
          const topic = asRecord(topicEntry);
          return {
            messageThreadId: normalizeTelegramTopicIdClient(topic.messageThreadId),
            title: readString(topic.title) || (normalizeTelegramTopicIdClient(topic.messageThreadId) === "main" ? "Main topic" : `Topic ${normalizeTelegramTopicIdClient(topic.messageThreadId)}`),
            lastSeenAt: readString(topic.lastSeenAt),
            source: readString(topic.source) === "manual" ? "manual" as const : "observed" as const,
          };
        }),
      };
    }).filter((group) => group.chatId),
  };
}

function TelegramTopicLockPanel({
  busy,
  lock,
  registry,
  manualTopic,
  onAddManual,
  onManualChange,
  onRenameTopic,
  onRefresh,
  onSave,
}: {
  busy: boolean;
  lock: TelegramTopicLock;
  registry: ReturnType<typeof normalizeTelegramTopicRegistryClient>;
  manualTopic: { chatId: string; title: string; messageThreadId: string; topicTitle: string };
  onAddManual: () => void;
  onManualChange: (value: { chatId: string; title: string; messageThreadId: string; topicTitle: string }) => void;
  onRenameTopic: (value: { chatId: string; title: string; messageThreadId: string; topicTitle: string }) => void;
  onRefresh: () => void;
  onSave: (lock: TelegramTopicLock) => void;
}) {
  const [editingTopic, setEditingTopic] = useState<{ key: string; title: string } | null>(null);
  const lockGroupsByChat = new Map(lock.groups.map((group) => [group.chatId, group]));
  const nextGroup = (chatId: string, patch: Partial<TelegramTopicLock["groups"][number]>) => {
    const registryGroup = registry.groups.find((group) => group.chatId === chatId);
    const existing = lockGroupsByChat.get(chatId);
    const group = {
      chatId,
      title: existing?.title || registryGroup?.title || "",
      isForum: existing?.isForum ?? registryGroup?.isForum ?? true,
      allowedTopicIds: existing?.allowedTopicIds ?? [],
      allowMainTopic: existing?.allowMainTopic ?? true,
      primaryTopicId: existing?.primaryTopicId ?? (existing?.allowedTopicIds?.[0] || ((existing?.allowMainTopic ?? true) ? "main" : "")),
      updatedAt: new Date().toISOString(),
      ...patch,
    };
    const allowedTopicSet = new Set(group.allowedTopicIds);
    const primaryTopicId = group.primaryTopicId || "";
    const primaryAllowed = primaryTopicId === "main" ? group.allowMainTopic : allowedTopicSet.has(primaryTopicId);
    if (!primaryAllowed) {
      group.primaryTopicId = group.allowedTopicIds[0] ?? (group.allowMainTopic ? "main" : "");
    }
    return {
      ...lock,
      enabled: true,
      groups: [...lock.groups.filter((item) => item.chatId !== chatId), group],
    };
  };
  const toggleTopic = (chatId: string, topicId: string, checked: boolean) => {
    const existing = lockGroupsByChat.get(chatId);
    const ids = new Set(existing?.allowedTopicIds ?? []);
    if (checked) ids.add(topicId);
    else ids.delete(topicId);
    return nextGroup(chatId, { allowedTopicIds: Array.from(ids) });
  };
  const setPrimaryTopic = (chatId: string, topicId: string) => nextGroup(chatId, { primaryTopicId: topicId });

  return (
    <div className="rounded-sm border border-border/70 bg-background/35 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-heading text-sm text-foreground">Topic Lock</h3>
          <p className="mt-1 text-xs text-muted-foreground">Discovered topics only. Add manually if Telegram has not sent an update from that topic yet.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleControl label="Topic Lock Active" value={lock.enabled} onChange={(enabled) => onSave({ ...lock, enabled })} />
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Topics
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {registry.groups.length === 0 && (
          <div className="rounded-sm border border-border bg-background/35 p-3 text-sm text-muted-foreground">
            No Telegram group topics observed yet. Add one manually or send a message from the target group topic.
          </div>
        )}
        {registry.groups.map((group) => {
          const groupLock = lockGroupsByChat.get(group.chatId);
          const allowMainTopic = groupLock?.allowMainTopic ?? true;
          const allowedTopicIds = groupLock?.allowedTopicIds ?? [];
          const primaryTopicId = groupLock?.primaryTopicId ?? (allowMainTopic ? "main" : allowedTopicIds[0] ?? "");
          return (
            <div key={group.chatId} className="rounded-sm border border-border/70 bg-background/35 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-heading text-sm text-foreground">{group.title || group.chatId}</p>
                  <p className="text-xs text-muted-foreground">{group.chatId} - {group.isForum ? "forum group" : "group"} - {group.source}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={allowMainTopic}
                      onChange={(event) => onSave(nextGroup(group.chatId, { allowMainTopic: event.target.checked }))}
                    />
                    Allow main topic
                  </label>
                  {allowMainTopic && (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-heading uppercase tracking-[0.12em] transition-colors",
                        primaryTopicId === "main" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => onSave(setPrimaryTopic(group.chatId, "main"))}
                    >
                      {primaryTopicId === "main" && <Check className="h-3 w-3" />}
                      {primaryTopicId === "main" ? "Main primary" : "Set main primary"}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {group.topics.filter((topic) => topic.messageThreadId !== "main").map((topic) => {
                  const allowed = allowedTopicIds.includes(topic.messageThreadId);
                  const primary = primaryTopicId === topic.messageThreadId;
                  const topicKey = `${group.chatId}:${topic.messageThreadId}`;
                  const editing = editingTopic?.key === topicKey;
                  return (
                    <div key={`${group.chatId}:${topic.messageThreadId}`} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-background p-2 text-sm">
                      <span className="min-w-0">
                        {editing ? (
                          <input
                            className={cn(inputClass, "h-8 py-1 text-xs")}
                            value={editingTopic.title}
                            onChange={(event) => setEditingTopic({ key: topicKey, title: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") setEditingTopic(null);
                              if (event.key === "Enter" && editingTopic.title.trim()) {
                                onRenameTopic({
                                  chatId: group.chatId,
                                  title: group.title,
                                  messageThreadId: topic.messageThreadId,
                                  topicTitle: editingTopic.title.trim(),
                                });
                                setEditingTopic(null);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="block truncate text-foreground">{topic.title}</span>
                        )}
                        <span className="block text-xs text-muted-foreground">Topic {topic.messageThreadId} - {topic.source}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-1 rounded-sm border border-primary bg-primary/15 px-2 text-[10px] font-heading uppercase tracking-[0.12em] text-primary"
                              disabled={busy || !editingTopic.title.trim()}
                              onClick={() => {
                                onRenameTopic({
                                  chatId: group.chatId,
                                  title: group.title,
                                  messageThreadId: topic.messageThreadId,
                                  topicTitle: editingTopic.title.trim(),
                                });
                                setEditingTopic(null);
                              }}
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-1 rounded-sm border border-border px-2 text-[10px] font-heading uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingTopic(null)}
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1 rounded-sm border border-border px-2 text-[10px] font-heading uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                            disabled={busy}
                            onClick={() => setEditingTopic({ key: topicKey, title: topic.title })}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit title
                          </button>
                        )}
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-heading uppercase tracking-[0.12em] transition-colors",
                            primary ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                            !allowed && "cursor-not-allowed opacity-50 hover:text-muted-foreground"
                          )}
                          disabled={!allowed}
                          onClick={() => onSave(setPrimaryTopic(group.chatId, topic.messageThreadId))}
                        >
                          {primary && <Check className="h-3 w-3" />}
                          {primary ? "Primary" : "Set primary"}
                        </button>
                        <input
                          type="checkbox"
                          checked={allowed}
                          onChange={(event) => onSave(toggleTopic(group.chatId, topic.messageThreadId, event.target.checked))}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_minmax(0,1fr)_auto] lg:items-end">
        <Field label="Manual Chat ID" value={manualTopic.chatId} onChange={(chatId) => onManualChange({ ...manualTopic, chatId })} placeholder="-100..." />
        <Field label="Group Title" value={manualTopic.title} onChange={(title) => onManualChange({ ...manualTopic, title })} placeholder="Optional" />
        <Field label="Topic ID" value={manualTopic.messageThreadId} onChange={(messageThreadId) => onManualChange({ ...manualTopic, messageThreadId })} placeholder="Main if empty" />
        <Field label="Topic Title" value={manualTopic.topicTitle} onChange={(topicTitle) => onManualChange({ ...manualTopic, topicTitle })} placeholder="Optional" />
        <Button type="button" variant="outline" onClick={onAddManual} disabled={busy || !manualTopic.chatId.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}

function DefaultFilesRegenerator({
  busy,
  confirm,
  mode,
  onConfirmChange,
  onModeChange,
  onRegenerate,
}: {
  busy: boolean;
  confirm: string;
  mode: "safe" | "force";
  onConfirmChange: (value: string) => void;
  onModeChange: (value: "safe" | "force") => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="rounded-sm border border-border/70 bg-background/35 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-heading text-sm text-foreground">Regenerate Defaults</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Safe mode fills missing, empty, or managed default files. Force mode overwrites generated defaults but never touches memory/history.jsonl.
          </p>
        </div>
        <select className={cn(inputClass, "sm:w-40")} value={mode} onChange={(event) => onModeChange(event.target.value as "safe" | "force")}>
          <option value="safe">Safe</option>
          <option value="force">Force</option>
        </select>
      </div>
      <div className="mt-3 grid gap-3 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label="Confirmation" value={confirm} onChange={onConfirmChange} placeholder='Type "DEFAULTS"' />
        <Button type="button" className="self-end" onClick={onRegenerate} disabled={busy || confirm !== "DEFAULTS"}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
      </div>
    </div>
  );
}

function SettingsEditor({
  busy,
  canManageSchedules,
  identityId,
  identityDraft,
  providerAccounts,
  settingsDraft,
  onIdentityChange,
  onSave,
  onSettingsChange,
}: {
  busy: boolean;
  canManageSchedules: boolean;
  identityId: string;
  identityDraft: BotIdentityDraft;
  providerAccounts: BotProviderAccount[];
  settingsDraft: BotSettingsDraft;
  onIdentityChange: (patch: Partial<BotIdentityDraft>) => void;
  onSave: () => void;
  onSettingsChange: (patch: Partial<BotSettingsDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name" value={identityDraft.name} onChange={(name) => onIdentityChange({ name })} />
        <Field label="Role" value={identityDraft.roleTitle} onChange={(roleTitle) => onIdentityChange({ roleTitle })} />
      </div>
      <label className="block space-y-2">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Description</span>
        <textarea className={cn(inputClass, "min-h-24 resize-y")} value={identityDraft.description} onChange={(event) => onIdentityChange({ description: event.target.value })} />
      </label>

      <div className="rounded-sm border border-border/70 bg-background/35 p-4">
        <h3 className="font-heading text-sm text-foreground">Runtime Provider Assignment</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Provider</span>
            <select
              className={inputClass}
              value={identityDraft.runtimeProvider}
              onChange={(event) => onIdentityChange({ runtimeProvider: event.target.value, runtimeProviderAccountId: "", runtimeOpenRouterProfileId: "" })}
            >
              <option value="">Use global default</option>
              {providers.map((provider) => (
                <option key={provider.value} value={provider.value}>{provider.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Provider account</span>
            <select
              className={inputClass}
              value={identityDraft.runtimeProviderAccountId}
              onChange={(event) => onIdentityChange({ runtimeProviderAccountId: event.target.value, runtimeOpenRouterProfileId: "" })}
              disabled={!identityDraft.runtimeProvider}
            >
              <option value="">Use default provider account</option>
              {providerAccounts.filter((account) => account.provider === identityDraft.runtimeProvider).map((account) => (
                <option key={account.id} value={account.id}>{account.name}{account.isActive ? " (default)" : ""} - {account.modelId}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-sm border border-border/70 bg-background/35 p-4">
          <h3 className="font-heading text-sm text-foreground">Agent Behaviour</h3>
          <div className="mt-4 space-y-3">
            <Field label="Max Tokens" type="number" value={settingsDraft.maxTokens} onChange={(maxTokens) => onSettingsChange({ maxTokens })} />
            <Field label="Temperature" type="number" value={settingsDraft.temperature} onChange={(temperature) => onSettingsChange({ temperature })} />
            <Field label="Max Tool Iterations" type="number" value={settingsDraft.maxToolIterations} onChange={(maxToolIterations) => onSettingsChange({ maxToolIterations })} />
          </div>
        </div>

        <div className="rounded-sm border border-border/70 bg-background/35 p-4">
          <h3 className="font-heading text-sm text-foreground">Auto Dream</h3>
          <div className="mt-4 space-y-3">
            <ToggleControl
              label="Scheduled Dream"
              description="Runs ZeroClaw memory consolidation for this personality runtime after Start or Restart."
              value={settingsDraft.autoDreamEnabled}
              onChange={(autoDreamEnabled) => onSettingsChange({ autoDreamEnabled })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Interval Hours" type="number" value={settingsDraft.autoDreamIntervalHours} onChange={(autoDreamIntervalHours) => onSettingsChange({ autoDreamIntervalHours })} />
              <Field label="Dream Model Override" value={settingsDraft.autoDreamModelOverride} onChange={(autoDreamModelOverride) => onSettingsChange({ autoDreamModelOverride })} placeholder="Optional model id" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Max Batch Size" type="number" value={settingsDraft.autoDreamMaxBatchSize} onChange={(autoDreamMaxBatchSize) => onSettingsChange({ autoDreamMaxBatchSize })} />
              <Field label="Max Iterations" type="number" value={settingsDraft.autoDreamMaxIterations} onChange={(autoDreamMaxIterations) => onSettingsChange({ autoDreamMaxIterations })} />
            </div>
            <ToggleControl
              label="Annotate Line Ages"
              description="Adds memory line age context during Dream analysis."
              value={settingsDraft.autoDreamAnnotateLineAges}
              onChange={(autoDreamAnnotateLineAges) => onSettingsChange({ autoDreamAnnotateLineAges })}
            />
          </div>
        </div>

        <div className="rounded-sm border border-border/70 bg-background/35 p-4">
          <h3 className="font-heading text-sm text-foreground">Tools And Environment</h3>
          <div className="mt-4 space-y-3">
            <SecretField label="Web Search API Key" name="bot-manager-web-search-api-key" value={settingsDraft.webSearchApiKey} onChange={(webSearchApiKey) => onSettingsChange({ webSearchApiKey })} />
            <Field label="Web Search Max Results" type="number" value={settingsDraft.webSearchMaxResults} onChange={(webSearchMaxResults) => onSettingsChange({ webSearchMaxResults })} />
            <Field label="Execution Timeout" type="number" value={settingsDraft.execTimeout} onChange={(execTimeout) => onSettingsChange({ execTimeout })} />
            <ToggleControl label="Restrict File Access" value={settingsDraft.restrictToWorkspace} onChange={(restrictToWorkspace) => onSettingsChange({ restrictToWorkspace })} />
            <ToggleControl
              label="Restart This Runtime After Sync"
              description="Applies only to this personality runtime when Sync updates its config or workspace."
              value={settingsDraft.restartAfterSync}
              onChange={(restartAfterSync) => onSettingsChange({ restartAfterSync })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-primary/35 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="font-heading text-sm text-foreground">Chat Access</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Atur apakah personality ini dapat membaca, merespons, atau memulai interaksi di chat Morneven. Default aman adalah disabled.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Access Mode</span>
            <select
              className={inputClass}
              value={identityDraft.chatAccess.mode}
              onChange={(event) => {
                const mode = event.target.value as BotChatAccessMode;
                onIdentityChange({ chatAccess: { ...identityDraft.chatAccess, mode } });
              }}
            >
              <option value="disabled">Disabled</option>
              <option value="mention-only">Mention only</option>
              <option value="respond">Respond in chat</option>
            </select>
          </label>
          <div className="flex items-end">
            <ToggleControl
              label="Allow bot-to-bot"
              description="Requires conversation policy allowBotToBot and remains rate-limited by the backend."
              value={identityDraft.chatAccess.allowBotToBot}
              onChange={(allowBotToBot) => onIdentityChange({ chatAccess: { ...identityDraft.chatAccess, allowBotToBot } })}
            />
          </div>
        </div>
        {identityDraft.chatAccess.mode !== "disabled" && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field
              label="Max Turns"
              type="number"
              value={String(identityDraft.chatAccess.maxTurns)}
              onChange={(value) => onIdentityChange({ chatAccess: { ...identityDraft.chatAccess, maxTurns: Math.max(0, Math.min(6, Number(value) || 0)) } })}
            />
            <Field
              label="Max Tokens Per Run"
              type="number"
              value={String(identityDraft.chatAccess.maxTokensPerRun)}
              onChange={(value) => onIdentityChange({ chatAccess: { ...identityDraft.chatAccess, maxTokensPerRun: Math.max(128, Math.min(4096, Number(value) || 128)) } })}
            />
          </div>
        )}
      </div>

      <RuntimeScheduleEditor
        identityId={identityId}
        canManage={canManageSchedules}
        disabled={busy}
      />

      <Button type="button" onClick={onSave} disabled={busy}>
        <Save className="mr-2 h-4 w-4" />
        Save Personality
      </Button>
    </div>
  );
}

function formatScheduleTimestamp(value?: string | null) {
  if (!value) return "Disabled";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function RuntimeScheduleEditor({
  identityId,
  canManage,
  disabled,
}: {
  identityId: string;
  canManage: boolean;
  disabled: boolean;
}) {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<BotRuntimeSchedule | null>(null);
  const [startEnabled, setStartEnabled] = useState(false);
  const [stopEnabled, setStopEnabled] = useState(false);
  const [startInput, setStartInput] = useState<ScheduleInput>(() => createDefaultScheduleInput());
  const [stopInput, setStopInput] = useState<ScheduleInput>(() => createDefaultScheduleInput());
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getBotRuntimeSchedule(identityId)
      .then((next) => {
        if (!active) return;
        setSchedule(next);
        setStartEnabled(Boolean(next.start));
        setStopEnabled(Boolean(next.stop));
        setStartInput(scheduleInputFromTask(next.start));
        setStopInput(scheduleInputFromTask(next.stop));
      })
      .catch((error) => {
        if (!active) return;
        toast({
          variant: "destructive",
          title: "Runtime schedule unavailable",
          description: error instanceof Error ? error.message : "Runtime schedule could not be loaded.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [identityId, toast]);

  const save = async () => {
    setSaving(true);
    try {
      const next = await updateBotRuntimeSchedule(identityId, {
        password,
        start: startEnabled ? startInput : null,
        stop: stopEnabled ? stopInput : null,
      });
      setSchedule(next);
      setStartInput(scheduleInputFromTask(next.start));
      setStopInput(scheduleInputFromTask(next.stop));
      setPassword("");
      toast({ title: "Runtime schedule saved" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Runtime schedule failed",
        description: error instanceof Error ? error.message : "Runtime schedule could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    try {
      await deleteBotRuntimeSchedule(identityId, password);
      setSchedule((current) => current ? { ...current, start: null, stop: null } : current);
      setStartEnabled(false);
      setStopEnabled(false);
      setPassword("");
      toast({ title: "Runtime schedule disabled" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Runtime schedule failed",
        description: error instanceof Error ? error.message : "Runtime schedule could not be disabled.",
      });
    } finally {
      setSaving(false);
    }
  };

  const controlsDisabled = disabled || loading || saving || !canManage;
  return (
    <div className="space-y-3 rounded-sm border border-border/70 bg-background/35 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-heading text-sm text-foreground">Runtime Start And Stop</h3>
        <span className="text-xs text-muted-foreground">
          Start {formatScheduleTimestamp(schedule?.start?.nextRunAt)} / Stop {formatScheduleTimestamp(schedule?.stop?.nextRunAt)}
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={startEnabled}
              disabled={controlsDisabled}
              onChange={(event) => setStartEnabled(event.target.checked)}
            />
            Scheduled start
          </label>
          <ScheduleEditor value={startInput} onChange={setStartInput} disabled={controlsDisabled || !startEnabled} />
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={stopEnabled}
              disabled={controlsDisabled}
              onChange={(event) => setStopEnabled(event.target.checked)}
            />
            Scheduled stop
          </label>
          <ScheduleEditor value={stopInput} onChange={setStopInput} disabled={controlsDisabled || !stopEnabled} />
        </div>
      </div>
      {canManage && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field label="Password Confirmation" type="password" value={password} onChange={setPassword} />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={saving || !password || (!schedule?.start && !schedule?.stop)}
            onClick={() => { void clear(); }}
          >
            Disable
          </Button>
          <Button
            type="button"
            disabled={saving || !password || (!startEnabled && !stopEnabled)}
            onClick={() => { void save(); }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
            Save Runtime Schedule
          </Button>
        </div>
      )}
    </div>
  );
}

function RuntimeFreezeControl({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const [freeze, setFreeze] = useState<BotRuntimeFreeze | null>(null);
  const [schedule, setSchedule] = useState<ScheduleInput>(() => createDefaultScheduleInput("relative"));
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("Project freeze");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getBotRuntimeFreeze()
      .then((next) => {
        if (!active) return;
        setFreeze(next);
        if (next.schedule) {
          setSchedule(scheduleInputFromTask(next.schedule));
          const nextReason = next.schedule.payload?.reason;
          if (typeof nextReason === "string" && nextReason.trim()) setReason(nextReason);
        }
      })
      .catch((error) => {
        if (!active) return;
        toast({
          variant: "destructive",
          title: "Runtime freeze unavailable",
          description: error instanceof Error ? error.message : "Runtime freeze state could not be loaded.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const save = async () => {
    setSaving(true);
    try {
      const task = await updateBotRuntimeFreeze({ ...schedule, password, reason });
      setFreeze((current) => ({
        schedule: task,
        state: current?.state ?? {
          frozen: false,
          frozenAt: null,
          reason: null,
          updatedBy: null,
          updatedAt: new Date().toISOString(),
        },
      }));
      setSchedule(scheduleInputFromTask(task));
      setPassword("");
      toast({ title: "Runtime freeze scheduled" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Runtime freeze failed",
        description: error instanceof Error ? error.message : "Runtime freeze could not be scheduled.",
      });
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    setSaving(true);
    try {
      await deleteBotRuntimeFreeze(password);
      setFreeze((current) => current ? {
        schedule: null,
        state: {
          ...current.state,
          frozen: false,
          frozenAt: null,
          reason: null,
          updatedAt: new Date().toISOString(),
        },
      } : current);
      setPassword("");
      toast({ title: "Runtime freeze cancelled" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Runtime freeze failed",
        description: error instanceof Error ? error.message : "Runtime freeze could not be cancelled.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-border/70 pt-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-heading text-sm text-foreground">Global Runtime Freeze</h3>
        <Badge variant={freeze?.state.frozen ? "destructive" : "outline"}>
          {freeze?.state.frozen
            ? "Frozen"
            : freeze?.schedule
              ? formatScheduleTimestamp(freeze.schedule.nextRunAt)
              : "Disabled"}
        </Badge>
      </div>
      <ScheduleEditor
        value={schedule}
        onChange={setSchedule}
        allowWeekly={false}
        disabled={loading || saving || !canManage}
      />
      {canManage && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Reason" value={reason} onChange={setReason} />
          <Field label="Password Confirmation" type="password" value={password} onChange={setPassword} />
        </div>
      )}
      {canManage && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={saving || !password || (!freeze?.schedule && !freeze?.state.frozen)}
            onClick={() => { void cancel(); }}
          >
            Cancel / Unfreeze
          </Button>
          <Button type="button" disabled={saving || !password || !reason.trim()} onClick={() => { void save(); }}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
            Schedule Freeze
          </Button>
        </div>
      )}
    </div>
  );
}

function ToggleControl({ label, description, value, disabled = false, onChange }: { label: string; description?: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      className={cn("flex w-full items-center justify-between gap-3 rounded-sm border border-border/70 bg-background/35 px-3 py-2 text-left", disabled && "cursor-not-allowed opacity-70")}
      disabled={disabled}
      onClick={() => onChange(!value)}
    >
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        {description && <span className="mt-1 block text-xs normal-case tracking-normal text-muted-foreground/75">{description}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-background transition-transform", value ? "translate-x-6" : "translate-x-1")} />
      </span>
    </button>
  );
}

function CompactSwitch({ ariaLabel, value, disabled = false, onChange }: { ariaLabel: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={value}
      disabled={disabled}
      className={cn("relative h-7 w-12 rounded-full border border-border/70 transition-colors", value ? "bg-primary" : "bg-muted/30", disabled ? "cursor-not-allowed opacity-75" : "hover:border-primary/70")}
      onClick={() => onChange(!value)}
    >
      <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-background shadow-sm transition-transform", value ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

const REVEAL_DURATION_MS = 10000;

function useRevealTimer() {
  const [revealed, setRevealed] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef(0);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clear();
    setRevealed(false);
    setRemaining(0);
  }, [clear]);

  const reveal = useCallback(() => {
    clear();
    endRef.current = Date.now() + REVEAL_DURATION_MS;
    setRevealed(true);
    setRemaining(Math.ceil(REVEAL_DURATION_MS / 1000));
    timerRef.current = setInterval(() => {
      const left = endRef.current - Date.now();
      if (left <= 0) {
        hide();
      } else {
        setRemaining(Math.ceil(left / 1000));
      }
    }, 250);
  }, [clear, hide]);

  useEffect(() => clear, [clear]);

  return { revealed, remaining, reveal, hide, toggle: () => (revealed ? hide() : reveal()) };
}

function RevealToggle({ revealed, onToggle, className }: { revealed: boolean; remaining?: number; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-background/60 text-muted-foreground transition hover:border-primary/60 hover:text-primary", className)}
      aria-label={revealed ? "Hide value" : "Show value"}
      title={revealed ? "Hide" : "Show for 10s"}
    >
      {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    </button>
  );
}

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  name,
}: {
  label: string;
  value: unknown;
  onChange: (value: SecretFieldValue) => void;
  placeholder?: string;
  name?: string;
}) {
  const generatedId = useId();
  const secret = readSecretRef(value);
  const [lastConfiguredSecret, setLastConfiguredSecret] = useState<BotSecretRef | null>(secret?.configured ? secret : null);
  const [focused, setFocused] = useState(false);
  const { revealed, remaining, reveal, hide, toggle } = useRevealTimer();
  const previousName = useRef(name);
  const inputName = `bot-manager-private-${generatedId.replace(/[^a-z0-9]/gi, "")}`;
  const inputValue = typeof value === "string" ? value : "";
  const hasNewValue = inputValue.length > 0;
  const configuredSecret = secret?.configured ? secret : lastConfiguredSecret;
  const configured = Boolean(configuredSecret?.configured);
  const displayText = configured ? `Encrypted: ${configuredSecret?.preview || "***"}` : "";
  const displayMode = !focused && !hasNewValue && Boolean(displayText);
  const displayValue = displayMode ? displayText : inputValue;
  const shouldMask = focused && !displayMode && !revealed;

  useEffect(() => {
    if (previousName.current !== name) {
      previousName.current = name;
      setFocused(false);
      hide();
      setLastConfiguredSecret(secret?.configured ? secret : null);
      return;
    }
    if (secret?.configured) {
      setLastConfiguredSecret(secret);
      setFocused(false);
      hide();
    }
    if (secret && !secret.configured) {
      setLastConfiguredSecret(null);
      setFocused(false);
      hide();
    }
  }, [name, secret?.configured, secret?.preview, hide]);

  const updateValue = (next: string) => {
    flushSync(() => {
      if (!next && configuredSecret) {
        onChange(configuredSecret);
        return;
      }
      onChange(next);
    });
  };

  return (
    <div className="block space-y-2">
      <div className="flex min-h-[18px] items-center">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <div className="relative">
        <input
          type="text"
          id={inputName}
          name={inputName}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          className={cn(inputClass, "min-w-0 pr-10", displayMode && configured && "text-primary")}
          style={shouldMask ? ({ WebkitTextSecurity: "disc" } as CSSProperties) : undefined}
          value={displayValue}
          placeholder={configured ? "Focus to enter replacement value" : placeholder}
          readOnly={displayMode}
          aria-readonly={displayMode}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => updateValue(event.target.value)}
        />
        {hasNewValue ? (
          <RevealToggle revealed={revealed} remaining={remaining} onToggle={toggle} className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent" />
        ) : null}
      </div>
    </div>
  );
}


function formatBotManagerError(error: unknown) {
  if (error instanceof ApiError) {
    const details = error.errors.map((item) => item.path ? `${item.path}: ${item.message}` : item.message);
    const codeText = error.errorCode ? `[${error.errorCode}] ` : "";
    return [codeText + error.message, ...details].filter(Boolean).join(" ");
  }
  return error instanceof Error ? error.message : "Request failed.";
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  type = "text",
  name,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
  name?: string;
  autoComplete?: string;
}) {
  const inputName = name ?? `bot-manager-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "field"}`;
  const isPassword = type === "password";
  const { revealed, remaining, toggle, hide } = useRevealTimer();
  useEffect(() => {
    if (!value && revealed) hide();
  }, [value, revealed, hide]);
  const effectiveType = isPassword && revealed ? "text" : type;
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <div className={cn(isPassword ? "relative" : "block")}>
        <input
          type={effectiveType}
          name={inputName}
          autoComplete={autoComplete ?? (type === "password" ? "new-password" : "off")}
          className={cn(inputClass, "min-w-0", isPassword && "pr-10", readOnly && "cursor-not-allowed opacity-75")}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          aria-readonly={readOnly}
          onChange={(event) => {
            if (!readOnly) onChange(event.target.value);
          }}
        />
        {isPassword && value.length > 0 ? (
          <RevealToggle revealed={revealed} remaining={remaining} onToggle={toggle} className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent" />
        ) : null}
      </div>
    </label>
  );

}

function TagField({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="block space-y-2">
      <div className="flex min-h-[18px] items-center">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <TagInput value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly} className="mt-0" />
    </div>
  );
}

function Metric({
  label,
  value,
  info,
  children,
}: {
  label: string;
  value: string | { base: string; parts: Array<{ value: string; kind: "down" | "up" }> };
  info?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border/70 bg-background/40 p-3">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {info && (
          <span className="group relative inline-flex">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-sm border border-border bg-popover p-2 text-xs normal-case tracking-normal text-popover-foreground shadow-lg group-hover:block">
              {info}
            </span>
          </span>
        )}
      </div>
      {typeof value === "string" ? (
        <p className="mt-1 break-words text-sm font-heading text-foreground">{value}</p>
      ) : (
        <p className="mt-1 break-words text-sm font-heading text-foreground">
          {value.base}
          {value.parts.length > 0 && (
            <span className="ml-1">
              (
              {value.parts.map((part, index) => (
                <span key={`${part.kind}-${index}`} className={cn(index > 0 && "ml-1", part.kind === "down" ? "text-destructive" : "text-emerald-400")}>
                  {part.value}
                </span>
              ))}
              )
            </span>
          )}
        </p>
      )}
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

type BalanceSparklinePoint = {
  date?: string;
  creditBalance?: number;
  dailySpend?: number;
};

function BalanceSparklineTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload?: BalanceSparklinePoint }>;
  label?: unknown;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload ?? {};
  const date = typeof point.date === "string" ? point.date : String(label ?? "");
  const balance = typeof point.creditBalance === "number" && Number.isFinite(point.creditBalance) ? point.creditBalance : null;
  const dailySpend = typeof point.dailySpend === "number" && Number.isFinite(point.dailySpend) ? Math.max(point.dailySpend, 0) : 0;

  return (
    <div className="grid min-w-36 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{date}</div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Balance</span>
        <span className="font-mono font-medium tabular-nums text-foreground">{formatMoney(balance, currency)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Spend</span>
        <span className={cn("font-mono font-medium tabular-nums", dailySpend > 0 ? "text-destructive" : "text-muted-foreground")}>
          {dailySpend > 0 ? `-${formatMoney(dailySpend, currency)}` : formatMoney(0, currency)}
        </span>
      </div>
    </div>
  );
}

function Profile({
  identity,
  large = false,
}: {
  identity: Pick<BotIdentity, "id" | "name" | "profileImageObjectPath" | "profileImageUrl">;
  large?: boolean;
}) {
  const sizeClass = large ? "h-16 w-16" : "h-12 w-12";
  const profileSrc = identity.profileImageObjectPath
    ? getBotManagerFileProxyUrl(identity.id, identity.profileImageObjectPath)
    : identity.profileImageUrl ?? "";
  return (
    <div className={cn(sizeClass, "overflow-hidden rounded-full border border-border bg-primary/10")}>
      {profileSrc ? (
        <AuthenticatedImage src={profileSrc} alt={identity.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-primary">{identity.name.slice(0, 1).toUpperCase()}</div>
      )}
    </div>
  );
}

function FileEditor({
  files,
  fileDraft,
  setFileDraft,
  onSave,
  onDelete,
  busy,
  defaultKind = "identity",
  newFilePath = "notes/new-file.md",
  allowedKinds = fileKinds,
}: {
  files: BotIdentityFile[];
  fileDraft: BotIdentityFile;
  setFileDraft: (file: BotIdentityFile) => void;
  onSave: () => void;
  onDelete: () => void;
  busy: boolean;
  defaultKind?: BotFileKind;
  newFilePath?: string;
  allowedKinds?: BotFileKind[];
}) {
  const readOnly = isReadOnlyFilePath(fileDraft.path);
  const protectedFile = isProtectedFilePath(fileDraft.path);
  const usageNote = getFileUsageNote(fileDraft);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<BotFileKind | "all">("all");
  const [sortMode, setSortMode] = useState<"name-asc" | "name-desc" | "recent">("name-asc");

  const availableKinds = useMemo(() => {
    const set = new Set<BotFileKind>();
    files.forEach((file) => set.add(file.kind));
    return Array.from(set);
  }, [files]);

  const visibleFiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = files.filter((file) => {
      if (kindFilter !== "all" && file.kind !== kindFilter) return false;
      if (!term) return true;
      return file.path.toLowerCase().includes(term) || file.kind.toLowerCase().includes(term);
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortMode === "recent") {
        const at = new Date(a.updatedAt || 0).getTime();
        const bt = new Date(b.updatedAt || 0).getTime();
        return bt - at;
      }
      const cmp = a.path.localeCompare(b.path);
      return sortMode === "name-desc" ? -cmp : cmp;
    });
    return sorted;
  }, [files, search, kindFilter, sortMode]);

  const toggleSortDirection = () => {
    setSortMode((prev) => {
      if (prev === "name-asc") return "name-desc";
      if (prev === "name-desc") return "recent";
      return "name-asc";
    });
  };
  const sortIcon = sortMode === "name-asc" ? <ArrowDownAZ className="h-3.5 w-3.5" /> : sortMode === "name-desc" ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />;
  const sortLabel = sortMode === "name-asc" ? "Name A→Z" : sortMode === "name-desc" ? "Name Z→A" : "Recent";

  return (
    <div className="grid gap-4 grid-cols-[minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="space-y-2 min-w-0">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => setFileDraft({ ...emptyFile(), kind: defaultKind, path: newFilePath })}
        >
          <FileText className="mr-2 h-4 w-4" />
          New File
        </Button>
        <div className="relative w-full min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files…"
            className={cn(inputClass, "h-9 pl-8 text-xs")}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Filter className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as BotFileKind | "all")}
              className={cn(inputClass, "h-9 w-full pl-7 pr-2 text-xs")}
            >
              <option value="all">All kinds</option>
              {(availableKinds.length ? availableKinds : allowedKinds).map((kind) => (
                <option key={kind} value={kind}>{kind}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={toggleSortDirection}
            className="inline-flex h-9 w-auto shrink-0 items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
            title={`Sort: ${sortLabel}`}
            aria-label={`Sort: ${sortLabel}`}
          >
            {sortIcon}
            <span className="hidden sm:inline">{sortLabel}</span>
          </button>
        </div>
        <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>{visibleFiles.length} of {files.length}</span>
          {(search || kindFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setKindFilter("all"); }}
              className="hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {visibleFiles.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border/60 bg-background/30 px-3 py-6 text-center text-xs text-muted-foreground">
              No files match.
            </div>
          ) : visibleFiles.map((file) => (
            <button
              key={file.id}
              type="button"
              className={cn(
                "w-full rounded-sm border px-3 py-2 text-left text-xs transition-colors",
                fileDraft.path === file.path ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/35 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setFileDraft(file)}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate font-heading">{file.path}</span>
                {isReadOnlyFilePath(file.path) && <Badge variant="outline" className="shrink-0 text-[9px]">RO</Badge>}
              </span>
              <span className="block truncate uppercase tracking-[0.12em]">{file.kind}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3 min-w-0">
        <div className={cn("rounded-sm border border-border/70 bg-background/35 p-3 text-xs text-muted-foreground", readOnly && "border-primary/50 text-primary")}>
          {usageNote}
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Field label="Path" value={fileDraft.path} readOnly={readOnly} onChange={(value) => setFileDraft({ ...fileDraft, path: value })} />
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Kind</span>
            <select className={cn(inputClass, readOnly && "cursor-not-allowed opacity-75")} value={fileDraft.kind} disabled={readOnly} onChange={(event) => setFileDraft({ ...fileDraft, kind: event.target.value as BotFileKind })}>
              {allowedKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </label>
        </div>
        <LineNumberedTextarea
          ariaLabel={`${fileDraft.path || "Workspace file"} content`}
          readOnly={readOnly}
          value={fileDraft.content}
          onChange={(content) => setFileDraft({ ...fileDraft, content })}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onSave} disabled={busy || readOnly} className="flex-1 sm:flex-initial">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save File
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete} disabled={busy || protectedFile || !fileDraft.id || fileDraft.id === "new"} className="flex-1 sm:flex-initial">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete File
          </Button>
        </div>
      </div>
    </div>
  );
}
