import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Hash,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  Play,
  Plus,
  Power,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { canAccessBotManager } from "@/lib/pl";
import { cn } from "@/lib/utils";
import {
  activateBotIdentity,
  activateBotProvider,
  activateOpenRouterProfile,
  clearBotManagerBackups,
  controlBotRuntime,
  createBotManagerBackup,
  createBotIdentity,
  createOpenRouterProfile,
  createBotManagerBackupDownloadTicket,
  deleteBotIdentity,
  deleteBotIdentityFile,
  deleteOpenRouterProfile,
  getBotManagerBackupDownloadUrl,
  getBotManagerFileProxyUrl,
  getBotIdentity,
  getBotManagerSummary,
  getBotRuntimeStatus,
  listBotManagerBackups,
  listOpenRouterProfiles,
  regenerateBotIdentityDefaultFiles,
  saveBotIdentityFile,
  syncBotManagerRuntime,
  unlockBotCredentials,
  updateBotCredential,
  updateBotGeneralConfig,
  updateBotIdentity,
  updateOpenRouterProfile,
  type BotManagerBackupJob,
  uploadBotProfileImage,
  type BotFileKind,
  type BotIdentity,
  type BotIdentityDetail,
  type BotIdentityFile,
  type BotProvider,
  type BotRuntimeStatus,
  type BotSummary,
  type OpenRouterProfile,
} from "@/services/botManagerApi";
import { getCharactersPage } from "@/services/loreApi";
import type { Character } from "@/types";

const providers: Array<{ value: BotProvider; label: string }> = [
  { value: "gemini", label: "Gemini" },
  { value: "anthropic", label: "Anthropic" },
  { value: "groq", label: "Groq" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "zhipu", label: "Zhipu" },
  { value: "vllm", label: "vLLM" },
];
const normalProviders = providers.filter((provider) => provider.value !== "openrouter") as Array<{ value: Exclude<BotProvider, "openrouter">; label: string }>;

const fileKinds: BotFileKind[] = ["identity", "memory", "cron", "skill", "session", "tool", "user", "system", "other"];
const tabs = ["channels", "system", "files", "memory", "cron", "sessions", "settings", "logs"] as const;
type BotTab = (typeof tabs)[number];
type ChannelKey = "telegram" | "whatsapp" | "discord" | "slack" | "feishu" | "dingtalk";
type JsonRecord = Record<string, unknown>;

const channelTabs: Array<{ key: ChannelKey; label: string; detail: string; icon: typeof MessageCircle }> = [
  { key: "telegram", label: "Telegram", detail: "BotFather token", icon: Send },
  { key: "whatsapp", label: "WhatsApp", detail: "Local bridge", icon: Phone },
  { key: "discord", label: "Discord", detail: "Bot token", icon: Hash },
  { key: "slack", label: "Slack", detail: "App token", icon: MessageCircle },
  { key: "feishu", label: "Feishu", detail: "Lark app", icon: MessageCircle },
  { key: "dingtalk", label: "DingTalk", detail: "Robot webhook", icon: MessageCircle },
];

type BotIdentityDraft = {
  name: string;
  roleTitle: string;
  description: string;
};

type BotSettingsDraft = {
  maxTokens: string;
  temperature: string;
  maxToolIterations: string;
  webSearchApiKey: string;
  webSearchMaxResults: string;
  execTimeout: string;
  restrictToWorkspace: boolean;
  restartAfterSync: boolean;
};

type GeneralConfigDraft = {
  timezone: string;
  globalRules: string;
  restartAfterSync: boolean;
  allowRuntimeReload: boolean;
};

type OpenRouterDraft = {
  id?: string;
  name: string;
  apiKey: string;
  apiBase: string;
  modelId: string;
  tags: string;
  notes: string;
};

const inputClass =
  "min-w-0 w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:ring-1 focus:ring-primary";
const textareaClass = `${inputClass} min-h-40 resize-y font-mono text-xs leading-5`;
const panelClass = "hud-border bg-card p-4 sm:p-5";
const RUNTIME_STATUS_POLL_MS = 60_000;
const BACKUP_ACTIVE_POLL_MS = 3_000;

function toJsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
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

function readNumberText(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : readString(value, String(fallback));
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function csvToArray(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function arrayToCsv(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").join(", ");
  return readString(value);
}

function formatCharacterLabel(character: Character) {
  const trait = character.traits?.[0] ?? character.occupation ?? character.race ?? "Lore";
  return `${character.name} - ${trait}`;
}

function createCharacterAutofill(character: Character) {
  return {
    name: character.name,
    role: character.occupation || character.race || "Morneven character",
    description: character.shortDesc || "",
  };
}

function createGeneralConfigDraft(value: unknown): GeneralConfigDraft {
  const config = asRecord(value);
  const gateway = asRecord(config.gateway);
  return {
    timezone: readString(config.timezone, "Asia/Singapore"),
    globalRules: readString(config.globalRules, "Follow Morneven website policy and active personality files."),
    restartAfterSync: readBoolean(gateway.restartAfterSync, true),
    allowRuntimeReload: readBoolean(gateway.allowRuntimeReload, true),
  };
}

function generalConfigDraftToConfig(base: JsonRecord, draft: GeneralConfigDraft): JsonRecord {
  return mergeRecord(base, {
    runtimeMode: "single-active-personality",
    timezone: draft.timezone,
    globalRules: draft.globalRules,
    gateway: {
      restartAfterSync: draft.restartAfterSync,
      allowRuntimeReload: draft.allowRuntimeReload,
    },
  });
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
  const tools = asRecord(settings.tools);
  const web = asRecord(tools.web);
  const search = asRecord(web.search);
  const exec = asRecord(tools.exec);
  const gateway = asRecord(settings.gateway);

  return {
    maxTokens: readNumberText(defaults.maxTokens, 8192),
    temperature: readNumberText(defaults.temperature, 0.7),
    maxToolIterations: readNumberText(defaults.maxToolIterations, 20),
    webSearchApiKey: readString(search.apiKey),
    webSearchMaxResults: readNumberText(search.maxResults, 5),
    execTimeout: readNumberText(exec.timeout, 60),
    restrictToWorkspace: readBoolean(exec.restrictToWorkspace, false),
    restartAfterSync: readBoolean(gateway.restartAfterSync, true),
  };
}

function settingsDraftToConfig(draft: BotSettingsDraft): JsonRecord {
  return {
    agents: {
      defaults: {
        maxTokens: numberFromText(draft.maxTokens, 8192),
        temperature: numberFromText(draft.temperature, 0.7),
        maxToolIterations: numberFromText(draft.maxToolIterations, 20),
      },
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
  const [generalDraft, setGeneralDraft] = useState<GeneralConfigDraft>(() => createGeneralConfigDraft({}));
  const [syncLog, setSyncLog] = useState("");
  const [runtimeStatus, setRuntimeStatus] = useState<BotRuntimeStatus | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    credentials: false,
    general: false,
    personalities: false,
    backup: false,
  });
  type MainTab = "runtime" | "credentials" | "personalities" | "config" | "backups";
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("runtime");

  const [credentialProvider, setCredentialProvider] = useState<BotProvider>("gemini");
  const [credentialApiKey, setCredentialApiKey] = useState("");
  const [credentialApiBase, setCredentialApiBase] = useState("");
  const [credentialModelId, setCredentialModelId] = useState("");
  const [credentialPassword, setCredentialPassword] = useState("");
  const [credentialKey, setCredentialKey] = useState("");
  const [credentialConfirm, setCredentialConfirm] = useState("");
  const [credentialUnlocked, setCredentialUnlocked] = useState(false);
  const [openRouterProfiles, setOpenRouterProfiles] = useState<OpenRouterProfile[]>([]);
  const [openRouterSearch, setOpenRouterSearch] = useState("");
  const [openRouterFilter, setOpenRouterFilter] = useState("all");
  const [openRouterPage, setOpenRouterPage] = useState(1);
  const [openRouterTotalPages, setOpenRouterTotalPages] = useState(1);
  const [openRouterDraft, setOpenRouterDraft] = useState<OpenRouterDraft>({ name: "", apiKey: "", apiBase: "", modelId: "", tags: "", notes: "" });

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
  const [personalityFilter, setPersonalityFilter] = useState("all");
  const [personalityPage, setPersonalityPage] = useState(1);
  const [loreSearch, setLoreSearch] = useState("");
  const [loreOptions, setLoreOptions] = useState<Character[]>([]);
  const [selectedLoreId, setSelectedLoreId] = useState("");
  const [defaultRegenerateMode, setDefaultRegenerateMode] = useState<"safe" | "force">("safe");
  const [defaultRegenerateConfirm, setDefaultRegenerateConfirm] = useState("");
  const [identityDraft, setIdentityDraft] = useState<BotIdentityDraft>({ name: "", roleTitle: "", description: "" });
  const [channelsDraft, setChannelsDraft] = useState<JsonRecord>(createDefaultChannels());
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>("telegram");
  const [settingsBase, setSettingsBase] = useState<JsonRecord>({});
  const [settingsDraft, setSettingsDraft] = useState<BotSettingsDraft>(() => createSettingsDraft({}));
  const [fileDraft, setFileDraft] = useState<BotIdentityFile>(emptyFile());
  const [backupMode, setBackupMode] = useState<"full" | "custom">("full");
  const [backupSelectedIds, setBackupSelectedIds] = useState<string[]>([]);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupKey, setBackupKey] = useState("");
  const [backupConfirm, setBackupConfirm] = useState("");
  const [backupJobs, setBackupJobs] = useState<BotManagerBackupJob[]>([]);
  const [backupPage, setBackupPage] = useState(1);
  const [backupTotalPages, setBackupTotalPages] = useState(1);
  const [backupStatus, setBackupStatus] = useState("all");
  const [backupHistoryMode, setBackupHistoryMode] = useState("all");
  const [runtimeNow, setRuntimeNow] = useState(() => Date.now());

  const activeIdentity = useMemo(
    () => summary?.identities.find((identity) => identity.isActive) ?? null,
    [summary],
  );
  const backupVisible = allowed && pageVisible && !collapsedSections.backup;
  const credentialsVisible = allowed && pageVisible && !collapsedSections.credentials;
  const personalitiesVisible = allowed && pageVisible && !collapsedSections.personalities;
  const hasActiveBackupJob = useMemo(() => backupJobs.some(isActiveBackupJob), [backupJobs]);
  const observedGatewayState = runtimeStatus?.gateway?.state ?? null;

  const canUnlockCredential =
    credentialPassword.length > 0 &&
    credentialKey.trim().length >= 16 &&
    credentialConfirm === "CREDENTIALS";

  const canSubmitCredential =
    credentialUnlocked &&
    credentialApiKey.trim().length > 0 &&
    credentialModelId.trim().length > 0 &&
    canUnlockCredential;

  const loadSummary = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const next = await getBotManagerSummary();
      setSummary(next);
      setGeneralBase(next.generalConfig);
      setGeneralDraft(createGeneralConfigDraft(next.generalConfig));
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
      setRuntimeError(err instanceof Error ? err.message : "Nanobot runtime unavailable.");
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
      });
      setChannelsDraft(normalizeChannels(next.channels));
      setSettingsBase(asRecord(next.settings));
      setSettingsDraft(createSettingsDraft(next.settings));
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

  useEffect(() => {
    if (allowed) {
      void loadSummary();
      void loadRuntimeStatus();
    }
  }, [allowed, loadRuntimeStatus, loadSummary]);

  useEffect(() => {
    if (!allowed || !pageVisible) return undefined;
    const interval = window.setInterval(() => {
      void loadRuntimeStatus();
    }, RUNTIME_STATUS_POLL_MS);
    return () => window.clearInterval(interval);
  }, [allowed, loadRuntimeStatus, pageVisible]);

  useEffect(() => {
    if (credentialsVisible && credentialUnlocked) void loadOpenRouterProfiles();
  }, [credentialUnlocked, credentialsVisible, loadOpenRouterProfiles]);

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
    const handle = window.setTimeout(async () => {
      if (!createLoreSearch.trim()) {
        setCreateLoreOptions([]);
        return;
      }
      try {
        const result = await getCharactersPage({ search: createLoreSearch, page: 1, pageSize: 8, sort: "name" });
        setCreateLoreOptions(result.items);
      } catch {
        setCreateLoreOptions([]);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [allowed, createLoreSearch, pageVisible, showCreatePersonality]);

  useEffect(() => {
    if (!allowed || !pageVisible || !(editingIdentityId && activeTab === "settings")) return undefined;
    const handle = window.setTimeout(async () => {
      if (!loreSearch.trim()) {
        setLoreOptions([]);
        return;
      }
      try {
        const result = await getCharactersPage({ search: loreSearch, page: 1, pageSize: 8, sort: "name" });
        setLoreOptions(result.items);
      } catch {
        setLoreOptions([]);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [activeTab, allowed, editingIdentityId, loreSearch, pageVisible]);

  useEffect(() => {
    if (personalitiesVisible && selectedId && editingIdentityId === selectedId) void loadDetail(selectedId);
  }, [editingIdentityId, loadDetail, personalitiesVisible, selectedId]);

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
    if (credentialsVisible && credentialUnlocked) tasks.push(loadOpenRouterProfiles());
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
      toast({ title: "Bot Manager action failed", description: err instanceof Error ? err.message : "Request failed." });
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

  const lockCredentials = () => {
    setCredentialUnlocked(false);
    setCredentialApiKey("");
    setCredentialApiBase("");
    setCredentialModelId("");
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

  const saveCredential = () =>
    runAction(
      "credential",
      async () => {
        await updateBotCredential({
          provider: credentialProvider,
          apiKey: credentialApiKey,
          apiBase: credentialApiBase.trim() || undefined,
          modelId: credentialModelId.trim(),
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        lockCredentials();
        await loadSummary();
      },
      "Credential saved",
    );

  const saveGeneralConfig = () =>
    runAction(
      "general",
      async () => {
        await updateBotGeneralConfig(generalConfigDraftToConfig(generalBase, generalDraft));
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
        setSummary((current) => current
          ? {
            ...current,
            identities: current.identities.map((item) => ({
              ...item,
              isActive: item.id === activated.id
            })),
            runtimeStatus: {
              ...current.runtimeStatus,
              activeIdentityId: activated.id
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
        setDetail((current) => current ? { ...current, isActive: current.id === activated.id } : current);
      },
      "Active personality updated",
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

  const saveOpenRouterProfile = () =>
    runAction(
      openRouterDraft.id ? `openrouter-${openRouterDraft.id}` : "openrouter-create",
      async () => {
        const payload = {
          name: openRouterDraft.name,
          apiKey: openRouterDraft.apiKey,
          apiBase: openRouterDraft.apiBase.trim() || undefined,
          modelId: openRouterDraft.modelId,
          tags: csvToArray(openRouterDraft.tags),
          notes: openRouterDraft.notes,
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS" as const,
        };
        if (openRouterDraft.id) await updateOpenRouterProfile(openRouterDraft.id, payload);
        else await createOpenRouterProfile(payload);
        setOpenRouterDraft({ name: "", apiKey: "", apiBase: "", modelId: "", tags: "", notes: "" });
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
        await updateBotIdentity(detail.id, {
          name: identityDraft.name,
          roleTitle: identityDraft.roleTitle,
          description: identityDraft.description,
          channels: channelsDraft,
          settings: mergeRecord(settingsBase, settingsDraftToConfig(settingsDraft)),
          loreCharacterId: selectedLoreId || undefined,
        });
        await refreshVisibleData();
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
    setBusy("sync");
    try {
      const nextSummary = await loadSummary();
      if (!nextSummary) throw new Error("Bot Manager unavailable.");
      const nextRuntime = await loadRuntimeStatus(true);
      const needsRuntimeSync = Boolean(nextSummary?.runtimeSync.runtimeDirty ?? summary?.runtimeSync.runtimeDirty);

      if (!needsRuntimeSync) {
        setSyncLog(toJsonText({ refreshed: true, runtime: nextRuntime }));
        toast({ title: "Runtime status refreshed" });
        return;
      }

      const result = await syncBotManagerRuntime();
      setSyncLog(toJsonText(result));
      if (result.nanobot && typeof result.nanobot === "object") setRuntimeStatus(result.nanobot as BotRuntimeStatus);
      await refreshVisibleData();
      toast({ title: "Runtime synced" });
    } catch (err) {
      await loadSummary();
      await loadRuntimeStatus(true);
      toast({ title: "Bot Manager action failed", description: err instanceof Error ? err.message : "Request failed." });
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
      `Nanobot ${action} requested`,
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

  const memoryFiles = detail?.files.filter(isMemoryFile) ?? [];
  const cronFiles = detail?.files.filter(isCronFile) ?? [];
  const sessionFiles = detail?.files.filter(isSessionFile) ?? [];
  const workspaceFiles = detail?.files.filter((file) => !isMemoryFile(file) && !isCronFile(file) && !isSessionFile(file)) ?? [];
  const nanobotConfigured = Boolean(summary?.runtimeStatus.nanobotConfigured);
  const runtimeActionDisabled = Boolean(busy) || !nanobotConfigured;
  const gatewayState = runtimeStatus?.gateway?.state ?? (nanobotConfigured ? "unknown" : "not configured");
  const gatewayRunning = gatewayState === "running";
  const gatewayTransitioning = gatewayState === "starting" || gatewayState === "stopping";
  const gatewayStartedAtMs = runtimeStatus?.gateway?.startedAt ? Date.parse(runtimeStatus.gateway.startedAt) : Number.NaN;
  const gatewayUptimeSeconds = gatewayRunning
    ? Number.isFinite(gatewayStartedAtMs)
      ? Math.max(Math.floor((runtimeNow - gatewayStartedAtMs) / 1000), 0)
      : runtimeStatus?.gateway?.uptime ?? 0
    : 0;
  const runtimeDirty = Boolean(summary?.runtimeSync.runtimeDirty);
  const runtimeConflictCount = summary?.runtimeSync.lastRuntimePullConflictCount ?? 0;
  const syncUnavailable = Boolean(error && !summary);
  const syncState = busy === "sync"
    ? "Syncing"
    : runtimeError
      ? "Nanobot unavailable"
      : runtimeConflictCount > 0
        ? `Sync conflict (${runtimeConflictCount})`
      : runtimeDirty && summary?.runtimeSync.lastRuntimeSyncError
        ? "Sync failed"
        : runtimeDirty
          ? "Sync needed"
          : "Up to date";
  const syncStateVariant: "default" | "outline" | "destructive" =
    syncState === "Sync failed" || syncState === "Nanobot unavailable" || syncState.startsWith("Sync conflict") ? "destructive" : syncState === "Sync needed" ? "default" : "outline";
  const lastSyncRaw = runtimeStatus?.morneven?.syncedAt ?? summary?.runtimeSync.lastRuntimeSyncAt;
  const lastSync = lastSyncRaw
    ? new Date(lastSyncRaw).toLocaleString()
    : "Never";
  const activeProvider = summary?.runtimeStatus.activeProvider ?? "";
  const activeOpenRouterProfileId = summary?.runtimeStatus.activeOpenRouterProfileId ?? "";
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
  const toggleSection = (key: string) => setCollapsedSections((current) => ({ ...current, [key]: !current[key] }));
  const updateChannel = (channel: ChannelKey, patch: JsonRecord) => {
    setChannelsDraft((current) => ({
      ...current,
      [channel]: {
        ...asRecord(current[channel]),
        ...patch,
      },
    }));
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
            <Button type="button" onClick={() => void syncRuntime()} disabled={loading || busy === "sync" || syncUnavailable}>
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
        </div>
        <div role="tablist" aria-label="Bot Manager sections" className="hud-border bg-card/40 p-1 flex gap-1 overflow-x-auto">
          {([
            { key: "runtime", label: "Runtime", icon: Bot },
            { key: "credentials", label: "Credentials", icon: KeyRound },
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
              <div className="grid gap-2 sm:grid-cols-3">
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
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Active Personality" value={activeIdentity?.name ?? "None"} />
              <Metric label="Saved Personalities" value={String(summary?.identities.length ?? 0)} />
              <Metric label="Nanobot Link" value={nanobotConfigured ? "Configured" : "Not configured"} />
              <Metric label="Sync State" value={syncState} />
              {runtimeDirty && <Metric label="Sync Reason" value={summary?.runtimeSync.runtimeDirtyReason ?? "Runtime changes pending"} />}
              <Metric label="Gateway State" value={gatewayState} />
              <Metric label="Gateway Uptime" value={formatUptime(gatewayUptimeSeconds)} />
              <Metric label="Last Sync" value={lastSync} />
            </div>
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
          {activeMainTab === "credentials" && (
          <div className={panelClass}>
            <div className="flex items-center gap-2 text-primary">
              <KeyRound className="h-4 w-4" />
              <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Credentials</h2>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={activeProvider ? "default" : "outline"}>
                  Active provider: {activeProvider || "none"}
                </Badge>
                {activeProvider === "openrouter" && (
                  <Badge variant="outline">OpenRouter profile: {openRouterProfiles.find((profile) => profile.id === activeOpenRouterProfileId)?.name ?? "selected"}</Badge>
                )}
              </div>
              {credentialUnlocked && (
                <Button type="button" variant="outline" onClick={lockCredentials} disabled={Boolean(busy)}>
                  Lock
                </Button>
              )}
            </div>
            {!credentialUnlocked ? (
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                <Field label="Password" value={credentialPassword} onChange={setCredentialPassword} type="password" />
                <Field label="Bot Manager Key" value={credentialKey} onChange={setCredentialKey} type="password" />
                <Field label="Confirmation" value={credentialConfirm} onChange={setCredentialConfirm} placeholder='Type "CREDENTIALS"' />
                <Button type="button" onClick={unlockCredentials} disabled={!canUnlockCredential || Boolean(busy)}>
                  {busy === "credential-unlock" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                  Unlock
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div className="space-y-2">
                  <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Active providers</p>
                  <div className="grid gap-3">
                  {normalProviders.map((provider) => {
                    const credential = summary?.credentials.find((item) => item.provider === provider.value);
                    const isActive = activeProvider === provider.value;
                    return (
                      <div key={provider.value} className={cn("rounded-sm border bg-background/35 p-3", isActive ? "border-primary/60" : "border-border/70")}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-heading text-sm text-foreground">{provider.label}</p>
                              {credential?.configured ? <Badge variant="outline" className="text-[10px]">Configured</Badge> : <Badge variant="destructive" className="text-[10px]">Missing</Badge>}
                              {isActive && <Badge className="text-[10px]"><Check className="mr-1 h-3 w-3" />Active</Badge>}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{credential?.configured ? `${credential.keyPreview} / ${readString(credential.metadata.modelId, "model not set")}` : "No credential configured"}</p>
                          </div>
                          <Button type="button" variant={isActive ? "outline" : "default"} size="sm" onClick={() => activateProvider(provider.value)} disabled={Boolean(busy) || !credential?.configured || isActive || !canUnlockCredential}>
                            <Power className="mr-2 h-4 w-4" />
                            {isActive ? "Active" : "Enable"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Add / update credential</p>
                  <div className="rounded-sm border border-border/70 bg-background/35 p-3">

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Provider</span>
                        <select className={inputClass} value={credentialProvider} onChange={(event) => setCredentialProvider(event.target.value as BotProvider)}>
                          {normalProviders.map((provider) => (
                            <option key={provider.value} value={provider.value}>{provider.label}</option>
                          ))}
                        </select>
                      </label>
                      <Field label="Model ID" value={credentialModelId} onChange={setCredentialModelId} placeholder="deepseek-chat" />
                      <Field label="API Key" value={credentialApiKey} onChange={setCredentialApiKey} type="password" />
                      <Field label="API Base" value={credentialApiBase} onChange={setCredentialApiBase} placeholder="Optional provider base URL" />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" onClick={saveCredential} disabled={!canSubmitCredential || Boolean(busy)}>
                        {busy === "credential" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                        Save Credential
                      </Button>
                    </div>
                  </div>
                </div>



                <OpenRouterSection

                  activeProfileId={activeOpenRouterProfileId}
                  busy={busy}
                  canUseCredentialGate={canUnlockCredential}
                  draft={openRouterDraft}
                  filter={openRouterFilter}
                  onActivate={setActiveOpenRouterProfile}
                  onDelete={removeOpenRouterProfile}
                  onDraftChange={setOpenRouterDraft}
                  onFilterChange={(value) => { setOpenRouterFilter(value); setOpenRouterPage(1); }}
                  onPageChange={setOpenRouterPage}
                  onSave={saveOpenRouterProfile}
                  onSearchChange={(value) => { setOpenRouterSearch(value); setOpenRouterPage(1); }}
                  page={openRouterPage}
                  profiles={openRouterProfiles}
                  search={openRouterSearch}
                  totalPages={openRouterTotalPages}
                />
              </div>
            )}
          </div>
          )}


          {activeMainTab === "config" && (
          <div className={panelClass}>
            <div className="flex items-center gap-2 text-primary">
              <Settings className="h-4 w-4" />
              <h2 className="font-heading text-sm uppercase tracking-[0.14em]">General Config</h2>
            </div>

              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Runtime Mode" value="single-active-personality" readOnly onChange={() => undefined} />
                  <Field label="Timezone" value={generalDraft.timezone} onChange={(timezone) => setGeneralDraft((current) => ({ ...current, timezone }))} placeholder="Asia/Singapore" />
                </div>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Global Rules</span>
                  <textarea className={cn(inputClass, "min-h-28 resize-y")} value={generalDraft.globalRules} onChange={(event) => setGeneralDraft((current) => ({ ...current, globalRules: event.target.value }))} />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleControl label="Restart after sync" value={generalDraft.restartAfterSync} onChange={(restartAfterSync) => setGeneralDraft((current) => ({ ...current, restartAfterSync }))} />
                  <ToggleControl label="Allow runtime reload" value={generalDraft.allowRuntimeReload} onChange={(allowRuntimeReload) => setGeneralDraft((current) => ({ ...current, allowRuntimeReload }))} />
                </div>
                <Button type="button" onClick={saveGeneralConfig} disabled={Boolean(busy)}>
                  <Save className="mr-2 h-4 w-4" />
                  Save General Config
                </Button>
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

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input className={cn(inputClass, "pl-9")} value={personalitySearch} onChange={(event) => { setPersonalitySearch(event.target.value); setPersonalityPage(1); }} placeholder="Search personality" />
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
                    const rowOpen = editingIdentityId === identity.id && detail?.id === identity.id;
                    return (
                      <div key={identity.id} className={cn("rounded-sm border border-border/80 bg-background/25", selectedId === identity.id && "border-primary")}>
                        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                          <Profile identity={identity} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-heading text-base text-foreground">{identity.name}</h3>
                              {identity.isActive && <Badge><Check className="mr-1 h-3 w-3" />Active</Badge>}
                              {readString(loreReference.id) ? <Badge variant="outline">Lore</Badge> : <Badge variant="destructive">No Lore</Badge>}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{identity.roleTitle}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{identity.description || "No description."}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                            {identity.isActive ? (
                              <Button type="button" size="sm" variant="outline" disabled className="cursor-default border-success/50 text-success disabled:opacity-100">
                                <Check className="mr-1.5 h-4 w-4" />
                                Active
                              </Button>
                            ) : (
                              <Button type="button" size="sm" variant="outline" onClick={() => activateIdentity(identity)} disabled={Boolean(busy)} title={`Activate ${identity.name}`}>
                                <Power className="mr-1.5 h-4 w-4" />
                                Activate
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant={rowOpen ? "secondary" : "default"}
                              onClick={() => { setSelectedId(identity.id); setEditingIdentityId(rowOpen ? null : identity.id); }}
                              aria-expanded={rowOpen}
                            >
                              {rowOpen ? (
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
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeIdentity(identity)} disabled={identity.isActive || Boolean(busy)} title={identity.isActive ? "Deactivate before deleting" : `Delete ${identity.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {rowOpen && (
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
                            {busy === "detail" ? (
                              <div className="flex min-h-40 items-center justify-center text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading personality config...
                              </div>
                            ) : (
                              <PersonalityEditor
                                activeTab={activeTab}
                                busy={busy}
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
                                onRegenerateConfirmChange={setDefaultRegenerateConfirm}
                                onRegenerateDefaults={regenerateDefaults}
                                onRegenerateModeChange={setDefaultRegenerateMode}
                                onSaveChannels={saveIdentity}
                                onSaveFile={saveFile}
                                onSaveIdentity={saveIdentity}
                                onSettingsChange={(patch) => setSettingsDraft((current) => ({ ...current, ...patch }))}
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
                </div>
                <PaginationControls page={personalityPage} totalPages={personalityTotalPages} onPageChange={setPersonalityPage} />
              </div>
          </div>
          )}

          {activeMainTab === "backups" && (
          <BackupSection
            backupCanCreate={backupCanCreate}
            backupConfirm={backupConfirm}
            backupHistoryMode={backupHistoryMode}
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
              className={cn("block w-full px-3 py-2 text-left text-sm hover:bg-primary/10", selectedId === character.id && "bg-primary/15 text-primary")}
              onClick={() => onSelect(character)}
            >
              {formatCharacterLabel(character)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedCharacterPreview({ character, onClear }: { character: Character; onClear: () => void }) {
  const traitText = character.traits.length ? character.traits.slice(0, 4).join(", ") : "No traits";
  const anecdotes = character.anecdotes?.slice(0, 2) ?? [];
  return (
    <div className="mt-3 rounded-sm border border-primary/50 bg-primary/10 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-sm border border-border bg-background">
          {character.thumbnail ? (
            <AuthenticatedImage src={character.thumbnail} alt={character.name} className="h-full w-full object-cover" />
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
                <Button type="button" size="sm" variant="outline" onClick={() => onDraftChange({ id: profile.id, name: profile.name, apiKey: "", apiBase: profile.apiBase, modelId: profile.modelId, tags: profile.tags.join(", "), notes: profile.notes })}>
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Profile Name" value={draft.name} onChange={(name) => onDraftChange({ ...draft, name })} placeholder="OpenRouter DeepSeek" />
          <Field label="Model ID" value={draft.modelId} onChange={(modelId) => onDraftChange({ ...draft, modelId })} placeholder="deepseek/deepseek-chat-v3" />
          <Field label="API Key" value={draft.apiKey} onChange={(apiKey) => onDraftChange({ ...draft, apiKey })} type="password" />
          <Field label="API Base" value={draft.apiBase} onChange={(apiBase) => onDraftChange({ ...draft, apiBase })} placeholder="https://openrouter.ai/api/v1" />
          <Field label="Tags" value={draft.tags} onChange={(tags) => onDraftChange({ ...draft, tags })} placeholder="reasoning, production" />
          <Field label="Notes" value={draft.notes} onChange={(notes) => onDraftChange({ ...draft, notes })} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={onSave} disabled={!draft.name.trim() || !draft.apiKey.trim() || !draft.modelId.trim() || !canUseCredentialGate || Boolean(busy)}>
            <Save className="mr-2 h-4 w-4" />
            {draft.id ? "Update OpenRouter Profile" : "Create OpenRouter Profile"}
          </Button>
          {draft.id && (
            <Button type="button" variant="outline" onClick={() => onDraftChange({ name: "", apiKey: "", apiBase: "", modelId: "", tags: "", notes: "" })}>
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
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn("rounded-sm border px-3 py-2 text-xs font-heading uppercase tracking-[0.12em]", activeTab === tab ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === "channels" && <ChannelEditor activeChannel={selectedChannel} busy={Boolean(busy)} channels={channelsDraft} onSave={onSaveChannels} onSelect={onChannelSelect} onUpdate={onChannelUpdate} />}
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
          <SettingsEditor busy={Boolean(busy)} identityDraft={identityDraft} settingsDraft={settingsDraft} onIdentityChange={onIdentityChange} onSave={onSaveIdentity} onSettingsChange={onSettingsChange} />
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
      {activeTab === "logs" && <textarea className={textareaClass} readOnly value={syncLog || "No sync response yet."} />}
    </div>
  );
}

function BackupSection({
  backupCanCreate,
  backupConfirm,
  backupHistoryMode,
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
  onKeyChange,
  onModeChange,
  onPageChange,
  onPasswordChange,
  onSelectedChange,
  onStatusChange,
  onToggle,
}: {
  backupCanCreate: boolean;
  backupConfirm: string;
  backupHistoryMode: string;
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
              <Field label="Password" value={backupPassword} onChange={onPasswordChange} type="password" />
              <Field label="Extraction Key" value={backupKey} onChange={onKeyChange} type="password" />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
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
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-[12rem_12rem_1fr_auto] md:items-center">
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
              <div key={job.id} className="grid gap-3 rounded-sm border border-border/70 bg-background/35 p-3 md:grid-cols-[minmax(0,1fr)_8rem_8rem_auto_auto] md:items-center">
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
  onSave,
  onSelect,
  onUpdate,
}: {
  activeChannel: ChannelKey;
  busy: boolean;
  channels: JsonRecord;
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
          <ChannelFields channel={activeChannel} config={config} onUpdate={(patch) => onUpdate(activeChannel, patch)} />
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
  onUpdate,
}: {
  channel: ChannelKey;
  config: JsonRecord;
  onUpdate: (patch: JsonRecord) => void;
}) {
  if (channel === "telegram") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Token" value={readString(config.token)} onChange={(token) => onUpdate({ token })} type="password" placeholder="123456:ABC-DEF" />
        <Field label="Allowed User IDs" value={arrayToCsv(config.allowFrom)} onChange={(value) => onUpdate({ allowFrom: csvToArray(value) })} placeholder="* or comma separated IDs" />
        <Field label="Proxy" value={readString(config.proxy)} onChange={(proxy) => onUpdate({ proxy })} placeholder="Optional proxy URL" />
      </div>
    );
  }

  if (channel === "whatsapp") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Bridge URL" value={readString(config.bridgeUrl, "ws://localhost:3001")} onChange={(bridgeUrl) => onUpdate({ bridgeUrl })} />
        <Field label="Allowed Numbers" value={arrayToCsv(config.allowFrom)} onChange={(value) => onUpdate({ allowFrom: csvToArray(value) })} />
      </div>
    );
  }

  if (channel === "discord") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Bot Token" value={readString(config.token)} onChange={(token) => onUpdate({ token })} type="password" />
        <Field label="Application ID" value={readString(config.applicationId)} onChange={(applicationId) => onUpdate({ applicationId })} />
        <Field label="Guild IDs" value={arrayToCsv(config.guildIds)} onChange={(value) => onUpdate({ guildIds: csvToArray(value) })} />
        <Field label="Channel IDs" value={arrayToCsv(config.channelIds)} onChange={(value) => onUpdate({ channelIds: csvToArray(value) })} />
      </div>
    );
  }

  if (channel === "slack") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Bot Token" value={readString(config.botToken)} onChange={(botToken) => onUpdate({ botToken })} type="password" />
        <Field label="App Token" value={readString(config.appToken)} onChange={(appToken) => onUpdate({ appToken })} type="password" />
        <Field label="Signing Secret" value={readString(config.signingSecret)} onChange={(signingSecret) => onUpdate({ signingSecret })} type="password" />
        <Field label="Channel IDs" value={arrayToCsv(config.channelIds)} onChange={(value) => onUpdate({ channelIds: csvToArray(value) })} />
      </div>
    );
  }

  if (channel === "feishu") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="App ID" value={readString(config.appId)} onChange={(appId) => onUpdate({ appId })} />
        <Field label="App Secret" value={readString(config.appSecret)} onChange={(appSecret) => onUpdate({ appSecret })} type="password" />
        <Field label="Verification Token" value={readString(config.verificationToken)} onChange={(verificationToken) => onUpdate({ verificationToken })} type="password" />
        <Field label="Encrypt Key" value={readString(config.encryptKey)} onChange={(encryptKey) => onUpdate({ encryptKey })} type="password" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Webhook URL" value={readString(config.webhookUrl)} onChange={(webhookUrl) => onUpdate({ webhookUrl })} />
      <Field label="Secret" value={readString(config.secret)} onChange={(secret) => onUpdate({ secret })} type="password" />
      <Field label="Allowed Senders" value={arrayToCsv(config.allowFrom)} onChange={(value) => onUpdate({ allowFrom: csvToArray(value) })} />
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
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
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
  identityDraft,
  settingsDraft,
  onIdentityChange,
  onSave,
  onSettingsChange,
}: {
  busy: boolean;
  identityDraft: BotIdentityDraft;
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
          <h3 className="font-heading text-sm text-foreground">Tools And Environment</h3>
          <div className="mt-4 space-y-3">
            <Field label="Web Search API Key" type="password" value={settingsDraft.webSearchApiKey} onChange={(webSearchApiKey) => onSettingsChange({ webSearchApiKey })} />
            <Field label="Web Search Max Results" type="number" value={settingsDraft.webSearchMaxResults} onChange={(webSearchMaxResults) => onSettingsChange({ webSearchMaxResults })} />
            <Field label="Execution Timeout" type="number" value={settingsDraft.execTimeout} onChange={(execTimeout) => onSettingsChange({ execTimeout })} />
            <ToggleControl label="Restrict File Access" value={settingsDraft.restrictToWorkspace} onChange={(restrictToWorkspace) => onSettingsChange({ restrictToWorkspace })} />
            <ToggleControl label="Restart After Sync" value={settingsDraft.restartAfterSync} onChange={(restartAfterSync) => onSettingsChange({ restartAfterSync })} />
          </div>
        </div>
      </div>

      <Button type="button" onClick={onSave} disabled={busy}>
        <Save className="mr-2 h-4 w-4" />
        Save Personality
      </Button>
    </div>
  );
}

function ToggleControl({ label, value, disabled = false, onChange }: { label: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      className={cn("flex w-full items-center justify-between gap-3 rounded-sm border border-border/70 bg-background/35 px-3 py-2 text-left", disabled && "cursor-not-allowed opacity-70")}
      disabled={disabled}
      onClick={() => onChange(!value)}
    >
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}>
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <input
        type={type}
        className={cn(inputClass, readOnly && "cursor-not-allowed opacity-75")}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-readonly={readOnly}
        onChange={(event) => {
          if (!readOnly) onChange(event.target.value);
        }}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/70 bg-background/40 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-heading text-foreground">{value}</p>
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
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => setFileDraft({ ...emptyFile(), kind: defaultKind, path: newFilePath })}
        >
          <FileText className="mr-2 h-4 w-4" />
          New File
        </Button>
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              className={cn(
                "w-full rounded-sm border px-3 py-2 text-left text-xs",
                fileDraft.path === file.path ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/35 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setFileDraft(file)}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate font-heading">{file.path}</span>
                {isReadOnlyFilePath(file.path) && <Badge variant="outline" className="shrink-0 text-[9px]">Read Only</Badge>}
              </span>
              <span className="block truncate uppercase tracking-[0.12em]">{file.kind}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className={cn("rounded-sm border border-border/70 bg-background/35 p-3 text-xs text-muted-foreground", readOnly && "border-primary/50 text-primary")}>
          {usageNote}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Field label="Path" value={fileDraft.path} readOnly={readOnly} onChange={(value) => setFileDraft({ ...fileDraft, path: value })} />
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Kind</span>
            <select className={cn(inputClass, readOnly && "cursor-not-allowed opacity-75")} value={fileDraft.kind} disabled={readOnly} onChange={(event) => setFileDraft({ ...fileDraft, kind: event.target.value as BotFileKind })}>
              {allowedKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </label>
        </div>
        <textarea className={cn(textareaClass, "min-h-96", readOnly && "cursor-not-allowed opacity-75")} readOnly={readOnly} aria-readonly={readOnly} value={fileDraft.content} onChange={(event) => {
          if (!readOnly) setFileDraft({ ...fileDraft, content: event.target.value });
        }} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onSave} disabled={busy || readOnly}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save File
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete} disabled={busy || protectedFile || !fileDraft.id || fileDraft.id === "new"}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete File
          </Button>
        </div>
      </div>
    </div>
  );
}
