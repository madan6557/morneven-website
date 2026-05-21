import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Bot,
  Brain,
  Check,
  FileText,
  Hash,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  Play,
  RefreshCw,
  Save,
  Send,
  Settings,
  Shield,
  Square,
  Upload,
} from "lucide-react";

import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { canAccessBotManager } from "@/lib/pl";
import { cn } from "@/lib/utils";
import {
  activateBotIdentity,
  controlBotRuntime,
  createBotIdentity,
  getBotManagerFileProxyUrl,
  getBotIdentity,
  getBotManagerSummary,
  getBotRuntimeStatus,
  saveBotIdentityFile,
  syncBotManagerRuntime,
  unlockBotCredentials,
  updateBotCredential,
  updateBotGeneralConfig,
  updateBotIdentity,
  uploadBotProfileImage,
  type BotFileKind,
  type BotIdentity,
  type BotIdentityDetail,
  type BotIdentityFile,
  type BotProvider,
  type BotRuntimeStatus,
  type BotSummary,
} from "@/services/botManagerApi";

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

const fileKinds: BotFileKind[] = ["identity", "memory", "cron", "skill", "session", "tool", "user", "system", "other"];
const tabs = ["channels", "system", "files", "memory", "settings", "logs"] as const;
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

const inputClass =
  "min-w-0 w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:ring-1 focus:ring-primary";
const textareaClass = `${inputClass} min-h-40 resize-y font-mono text-xs leading-5`;
const panelClass = "hud-border bg-card p-4 sm:p-5";

function toJsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonObject(value: string) {
  const parsed = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON must be an object.");
  }
  return parsed as Record<string, unknown>;
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

function isMemoryFile(file: Pick<BotIdentityFile, "kind" | "path">) {
  return file.kind === "memory" || file.path === "MEMORY.md" || file.path.startsWith("memory/");
}

export default function BotManagerPage() {
  const { isAuthenticated, role, personnelLevel } = useAuth();
  const { toast } = useToast();
  const allowed = canAccessBotManager(personnelLevel, role);
  const [summary, setSummary] = useState<BotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BotIdentityDetail | null>(null);
  const [activeTab, setActiveTab] = useState<BotTab>("channels");
  const [generalConfigText, setGeneralConfigText] = useState("{}");
  const [syncLog, setSyncLog] = useState("");
  const [runtimeStatus, setRuntimeStatus] = useState<BotRuntimeStatus | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const [credentialProvider, setCredentialProvider] = useState<BotProvider>("gemini");
  const [credentialApiKey, setCredentialApiKey] = useState("");
  const [credentialApiBase, setCredentialApiBase] = useState("");
  const [credentialModelId, setCredentialModelId] = useState("");
  const [credentialPassword, setCredentialPassword] = useState("");
  const [credentialKey, setCredentialKey] = useState("");
  const [credentialConfirm, setCredentialConfirm] = useState("");
  const [credentialUnlocked, setCredentialUnlocked] = useState(false);

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [identityDraft, setIdentityDraft] = useState<BotIdentityDraft>({ name: "", roleTitle: "", description: "" });
  const [channelsDraft, setChannelsDraft] = useState<JsonRecord>(createDefaultChannels());
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>("telegram");
  const [settingsBase, setSettingsBase] = useState<JsonRecord>({});
  const [settingsDraft, setSettingsDraft] = useState<BotSettingsDraft>(() => createSettingsDraft({}));
  const [fileDraft, setFileDraft] = useState<BotIdentityFile>(emptyFile());

  const activeIdentity = useMemo(
    () => summary?.identities.find((identity) => identity.isActive) ?? null,
    [summary],
  );

  const canUnlockCredential =
    credentialPassword.length > 0 &&
    credentialKey.trim().length >= 16 &&
    credentialConfirm === "CREDENTIALS";

  const canSubmitCredential =
    credentialUnlocked &&
    credentialApiKey.trim().length > 0 &&
    credentialModelId.trim().length > 0 &&
    canUnlockCredential;

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getBotManagerSummary();
      setSummary(next);
      setGeneralConfigText(toJsonText(next.generalConfig));
      const preferred = next.runtimeStatus.activeIdentityId ?? next.identities[0]?.id ?? null;
      setSelectedId((current) => current ?? preferred);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bot Manager unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRuntimeStatus = useCallback(async () => {
    try {
      const next = await getBotRuntimeStatus();
      setRuntimeStatus(next);
      setRuntimeError(null);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : "Nanobot runtime unavailable.");
    }
  }, []);

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
    if (!allowed) return undefined;
    const interval = window.setInterval(() => {
      void loadRuntimeStatus();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [allowed, loadRuntimeStatus]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!allowed) return <Navigate to="/home" replace />;

  const refreshAll = async () => {
    await Promise.all([loadSummary(), loadRuntimeStatus()]);
    if (selectedId) await loadDetail(selectedId);
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
      "Credential section unlocked",
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
        const parsed = parseJsonObject(generalConfigText);
        await updateBotGeneralConfig(parsed);
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
        });
        setNewName("");
        setNewRole("");
        setNewDescription("");
        setSelectedId(created.id);
        await loadSummary();
      },
      "Personality created",
    );

  const activateIdentity = (identity: BotIdentity) =>
    runAction(
      `activate-${identity.id}`,
      async () => {
        await activateBotIdentity(identity.id);
        await refreshAll();
      },
      "Active personality updated",
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
        });
        await refreshAll();
      },
      "Personality saved",
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
      },
      "File saved",
    );

  const uploadProfile = (file: File) =>
    detail &&
    runAction(
      "profile",
      async () => {
        await uploadBotProfileImage(detail.id, file);
        await refreshAll();
      },
      "Profile image uploaded",
    );

  const syncRuntime = () =>
    runAction(
      "sync",
      async () => {
        const result = await syncBotManagerRuntime();
        setSyncLog(toJsonText(result));
        if (result.nanobot && typeof result.nanobot === "object") setRuntimeStatus(result.nanobot as BotRuntimeStatus);
        await loadRuntimeStatus();
      },
      "Runtime sync requested",
    );

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

  const memoryFiles = detail?.files.filter(isMemoryFile) ?? [];
  const workspaceFiles = detail?.files.filter((file) => !isMemoryFile(file)) ?? [];
  const nanobotConfigured = Boolean(summary?.runtimeStatus.nanobotConfigured);
  const runtimeActionDisabled = Boolean(busy) || !nanobotConfigured;
  const gatewayState = runtimeStatus?.gateway?.state ?? (nanobotConfigured ? "unknown" : "not configured");
  const gatewayRunning = gatewayState === "running";
  const gatewayTransitioning = gatewayState === "starting" || gatewayState === "stopping";
  const lastSync = runtimeStatus?.morneven?.syncedAt
    ? new Date(runtimeStatus.morneven.syncedAt).toLocaleString()
    : "Never";
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
            <p className="font-display text-[10px] uppercase tracking-[0.28em] text-muted-foreground">PL7 Bot Operations</p>
            <h1 className="font-display text-3xl uppercase tracking-[0.14em] text-primary md:text-4xl">Bot Manager</h1>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void refreshAll()} disabled={loading || Boolean(busy)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" onClick={syncRuntime} disabled={Boolean(busy) || !activeIdentity}>
              {busy === "sync" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Sync Runtime
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className={panelClass}>
            <div className="flex items-center gap-2 text-primary">
              <Bot className="h-4 w-4" />
              <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Runtime</h2>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <Metric label="Active Personality" value={activeIdentity?.name ?? "None"} />
              <Metric label="Saved Personalities" value={String(summary?.identities.length ?? 0)} />
              <Metric label="Nanobot Link" value={nanobotConfigured ? "Configured" : "Not configured"} />
              <Metric label="Gateway State" value={gatewayState} />
              <Metric label="Gateway Uptime" value={formatUptime(runtimeStatus?.gateway?.uptime)} />
              <Metric label="Last Sync" value={lastSync} />
            </div>
            {runtimeError && (
              <div className="mt-3 rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {runtimeError}
              </div>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
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

          <div className={cn(panelClass, "lg:col-span-2")}>
            <div className="flex items-center gap-2 text-primary">
              <KeyRound className="h-4 w-4" />
              <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Credential Section</h2>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {summary?.credentials.map((credential) => (
                  <Badge key={credential.provider} variant={credential.configured ? "default" : "outline"}>
                    {credential.provider}: {credential.configured ? credential.keyPreview : "empty"}
                    {typeof credential.metadata.modelId === "string" && credential.metadata.modelId ? ` / ${credential.metadata.modelId}` : ""}
                  </Badge>
                ))}
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
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Provider</span>
                    <select className={inputClass} value={credentialProvider} onChange={(event) => setCredentialProvider(event.target.value as BotProvider)}>
                      {providers.map((provider) => (
                        <option key={provider.value} value={provider.value}>{provider.label}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="Model ID" value={credentialModelId} onChange={setCredentialModelId} placeholder="deepseek-chat" />
                  <Field label="API Key" value={credentialApiKey} onChange={setCredentialApiKey} type="password" />
                  <Field label="API Base" value={credentialApiBase} onChange={setCredentialApiBase} placeholder="Optional provider base URL" />
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={saveCredential} disabled={!canSubmitCredential || Boolean(busy)}>
                    {busy === "credential" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                    Save Credential
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)]">
          <div className="space-y-4">
            <div className={panelClass}>
              <div className="flex items-center gap-2 text-primary">
                <Settings className="h-4 w-4" />
                <h2 className="font-heading text-sm uppercase tracking-[0.14em]">General Config</h2>
              </div>
              <textarea className={cn(textareaClass, "mt-4")} value={generalConfigText} onChange={(event) => setGeneralConfigText(event.target.value)} />
              <Button type="button" className="mt-3 w-full" onClick={saveGeneralConfig} disabled={Boolean(busy)}>
                <Save className="mr-2 h-4 w-4" />
                Save General Config
              </Button>
            </div>

            <div className={panelClass}>
              <div className="flex items-center gap-2 text-primary">
                <Brain className="h-4 w-4" />
                <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Create Personality</h2>
              </div>
              <div className="mt-4 space-y-3">
                <Field label="Name" value={newName} onChange={setNewName} placeholder="Sola" />
                <Field label="Role" value={newRole} onChange={setNewRole} placeholder="Morneven assistant" />
                <label className="space-y-2 block">
                  <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Description</span>
                  <textarea className={cn(inputClass, "min-h-24 resize-y")} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} />
                </label>
                <Button type="button" className="w-full" onClick={createIdentity} disabled={!newName.trim() || !newRole.trim() || Boolean(busy)}>
                  Create
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {summary?.identities.map((identity) => (
                <Card key={identity.id} className={cn("cursor-pointer border-border/80 bg-card/95", selectedId === identity.id && "border-primary")}>
                  <button type="button" className="w-full text-left" onClick={() => setSelectedId(identity.id)}>
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                      <Profile identity={identity} />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">{identity.name}</CardTitle>
                        <CardDescription className="truncate">{identity.roleTitle}</CardDescription>
                      </div>
                      {identity.isActive && <Badge><Check className="mr-1 h-3 w-3" />Active</Badge>}
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{identity.description || "No description."}</CardContent>
                  </button>
                  <div className="px-6 pb-4">
                    <Button type="button" variant={identity.isActive ? "outline" : "default"} size="sm" className="w-full" onClick={() => activateIdentity(identity)} disabled={identity.isActive || Boolean(busy)}>
                      Make Active
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            {loading || busy === "detail" ? (
              <div className="flex min-h-80 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading bot manager data...
              </div>
            ) : !detail ? (
              <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">Create or select a personality.</div>
            ) : (
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
                      if (file) void uploadProfile(file);
                      event.currentTarget.value = "";
                    }} />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={cn(
                        "rounded-sm border px-3 py-2 text-xs font-heading uppercase tracking-[0.12em]",
                        activeTab === tab ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => {
                        setActiveTab(tab);
                        if (tab === "files") setFileDraft(workspaceFiles[0] ?? { ...emptyFile(), kind: "identity", path: "SOUL.md" });
                        if (tab === "memory") setFileDraft(memoryFiles[0] ?? { ...emptyFile(), kind: "memory", path: "MEMORY.md" });
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === "channels" && (
                  <ChannelEditor
                    activeChannel={selectedChannel}
                    busy={Boolean(busy)}
                    channels={channelsDraft}
                    onSave={saveIdentity}
                    onSelect={setSelectedChannel}
                    onUpdate={updateChannel}
                  />
                )}

                {activeTab === "system" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Metric label="Runtime Mode" value="Single active personality" />
                    <Metric label="Current Active" value={detail.isActive ? "Yes" : "No"} />
                    <Metric label="Workspace Files" value={String(detail.files.length)} />
                    <Metric label="Memory Files" value={String(memoryFiles.length)} />
                  </div>
                )}

                {activeTab === "files" && (
                  <FileEditor files={workspaceFiles} fileDraft={fileDraft} setFileDraft={setFileDraft} onSave={saveFile} busy={busy === "file"} allowedKinds={fileKinds.filter((kind) => kind !== "memory")} />
                )}

                {activeTab === "memory" && (
                  <FileEditor files={memoryFiles} fileDraft={fileDraft} setFileDraft={setFileDraft} onSave={saveFile} busy={busy === "file"} defaultKind="memory" allowedKinds={["memory"]} />
                )}

                {activeTab === "settings" && (
                  <SettingsEditor
                    busy={Boolean(busy)}
                    identityDraft={identityDraft}
                    settingsDraft={settingsDraft}
                    onIdentityChange={(patch) => setIdentityDraft((current) => ({ ...current, ...patch }))}
                    onSave={saveIdentity}
                    onSettingsChange={(patch) => setSettingsDraft((current) => ({ ...current, ...patch }))}
                  />
                )}

                {activeTab === "logs" && (
                  <textarea className={textareaClass} readOnly value={syncLog || "No sync response yet."} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
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

function ToggleControl({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" className="flex w-full items-center justify-between gap-3 rounded-sm border border-border/70 bg-background/35 px-3 py-2 text-left" onClick={() => onChange(!value)}>
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-background transition-transform", value ? "translate-x-6" : "translate-x-1")} />
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <input type={type} className={inputClass} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
  busy,
  defaultKind = "identity",
  allowedKinds = fileKinds,
}: {
  files: BotIdentityFile[];
  fileDraft: BotIdentityFile;
  setFileDraft: (file: BotIdentityFile) => void;
  onSave: () => void;
  busy: boolean;
  defaultKind?: BotFileKind;
  allowedKinds?: BotFileKind[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => setFileDraft({ ...emptyFile(), kind: defaultKind, path: defaultKind === "memory" ? "memory/note.md" : "SOUL.md" })}
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
              <span className="block truncate font-heading">{file.path}</span>
              <span className="block truncate uppercase tracking-[0.12em]">{file.kind}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Field label="Path" value={fileDraft.path} onChange={(value) => setFileDraft({ ...fileDraft, path: value })} />
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Kind</span>
            <select className={inputClass} value={fileDraft.kind} onChange={(event) => setFileDraft({ ...fileDraft, kind: event.target.value as BotFileKind })}>
              {allowedKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </label>
        </div>
        <textarea className={cn(textareaClass, "min-h-96")} value={fileDraft.content} onChange={(event) => setFileDraft({ ...fileDraft, content: event.target.value })} />
        <Button type="button" onClick={onSave} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save File
        </Button>
      </div>
    </div>
  );
}
