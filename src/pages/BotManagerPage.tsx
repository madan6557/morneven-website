import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Bot,
  Brain,
  Check,
  FileText,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Settings,
  Shield,
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
  createBotIdentity,
  getBotManagerFileProxyUrl,
  getBotIdentity,
  getBotManagerSummary,
  saveBotIdentityFile,
  syncBotManagerRuntime,
  updateBotCredential,
  updateBotGeneralConfig,
  updateBotIdentity,
  uploadBotProfileImage,
  type BotFileKind,
  type BotIdentity,
  type BotIdentityDetail,
  type BotIdentityFile,
  type BotProvider,
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

  const [credentialProvider, setCredentialProvider] = useState<BotProvider>("gemini");
  const [credentialApiKey, setCredentialApiKey] = useState("");
  const [credentialApiBase, setCredentialApiBase] = useState("");
  const [credentialPassword, setCredentialPassword] = useState("");
  const [credentialKey, setCredentialKey] = useState("");
  const [credentialConfirm, setCredentialConfirm] = useState("");

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [identityDraft, setIdentityDraft] = useState({ name: "", roleTitle: "", description: "", channels: "{}", settings: "{}" });
  const [fileDraft, setFileDraft] = useState<BotIdentityFile>(emptyFile());

  const activeIdentity = useMemo(
    () => summary?.identities.find((identity) => identity.isActive) ?? null,
    [summary],
  );

  const canSubmitCredential =
    credentialApiKey.trim().length > 0 &&
    credentialPassword.length > 0 &&
    credentialKey.trim().length >= 16 &&
    credentialConfirm === "CREDENTIALS";

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

  const loadDetail = useCallback(async (id: string) => {
    setBusy("detail");
    try {
      const next = await getBotIdentity(id);
      setDetail(next);
      setIdentityDraft({
        name: next.name,
        roleTitle: next.roleTitle,
        description: next.description,
        channels: toJsonText(next.channels),
        settings: toJsonText(next.settings),
      });
      const firstFile = next.files.find((file) => file.path === "SOUL.md") ?? next.files[0] ?? emptyFile();
      setFileDraft(firstFile);
    } catch (err) {
      toast({ title: "Bot detail unavailable", description: err instanceof Error ? err.message : "Unable to load bot detail." });
    } finally {
      setBusy(null);
    }
  }, [toast]);

  useEffect(() => {
    if (allowed) void loadSummary();
  }, [allowed, loadSummary]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!allowed) return <Navigate to="/home" replace />;

  const refreshAll = async () => {
    await loadSummary();
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

  const saveCredential = () =>
    runAction(
      "credential",
      async () => {
        await updateBotCredential({
          provider: credentialProvider,
          apiKey: credentialApiKey,
          apiBase: credentialApiBase.trim() || undefined,
          password: credentialPassword,
          botManagerKey: credentialKey,
          confirmText: "CREDENTIALS",
        });
        setCredentialApiKey("");
        setCredentialApiBase("");
        setCredentialPassword("");
        setCredentialKey("");
        setCredentialConfirm("");
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
          channels: parseJsonObject(identityDraft.channels),
          settings: parseJsonObject(identityDraft.settings),
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
      },
      "Runtime sync requested",
    );

  const memoryFiles = detail?.files.filter((file) => file.kind === "memory" || file.path === "MEMORY.md" || file.path.startsWith("memory/")) ?? [];

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
              <Metric label="Nanobot Link" value={summary?.runtimeStatus.nanobotConfigured ? "Configured" : "Not configured"} />
            </div>
          </div>

          <div className={cn(panelClass, "lg:col-span-2")}>
            <div className="flex items-center gap-2 text-primary">
              <KeyRound className="h-4 w-4" />
              <h2 className="font-heading text-sm uppercase tracking-[0.14em]">Credential Section</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Provider</span>
                <select className={inputClass} value={credentialProvider} onChange={(event) => setCredentialProvider(event.target.value as BotProvider)}>
                  {providers.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
              </label>
              <Field label="API Key" value={credentialApiKey} onChange={setCredentialApiKey} type="password" />
              <Field label="API Base" value={credentialApiBase} onChange={setCredentialApiBase} placeholder="Optional provider base URL" />
              <Field label="Password" value={credentialPassword} onChange={setCredentialPassword} type="password" />
              <Field label="Bot Manager Key" value={credentialKey} onChange={setCredentialKey} type="password" />
              <Field label="Confirmation" value={credentialConfirm} onChange={setCredentialConfirm} placeholder='Type "CREDENTIALS"' />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {summary?.credentials.map((credential) => (
                  <Badge key={credential.provider} variant={credential.configured ? "default" : "outline"}>
                    {credential.provider}: {credential.configured ? credential.keyPreview : "empty"}
                  </Badge>
                ))}
              </div>
              <Button type="button" onClick={saveCredential} disabled={!canSubmitCredential || Boolean(busy)}>
                {busy === "credential" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Save Credential
              </Button>
            </div>
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
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === "channels" && (
                  <div className="space-y-3">
                    <JsonEditor label="Channels JSON" value={identityDraft.channels} onChange={(value) => setIdentityDraft((current) => ({ ...current, channels: value }))} />
                    <Button type="button" onClick={saveIdentity} disabled={Boolean(busy)}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Channels
                    </Button>
                  </div>
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
                  <FileEditor files={detail.files} fileDraft={fileDraft} setFileDraft={setFileDraft} onSave={saveFile} busy={busy === "file"} />
                )}

                {activeTab === "memory" && (
                  <FileEditor files={memoryFiles} fileDraft={fileDraft} setFileDraft={setFileDraft} onSave={saveFile} busy={busy === "file"} defaultKind="memory" />
                )}

                {activeTab === "settings" && (
                  <div className="space-y-3">
                    <Field label="Name" value={identityDraft.name} onChange={(value) => setIdentityDraft((current) => ({ ...current, name: value }))} />
                    <Field label="Role" value={identityDraft.roleTitle} onChange={(value) => setIdentityDraft((current) => ({ ...current, roleTitle: value }))} />
                    <label className="space-y-2 block">
                      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Description</span>
                      <textarea className={cn(inputClass, "min-h-24 resize-y")} value={identityDraft.description} onChange={(event) => setIdentityDraft((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <JsonEditor label="Settings JSON" value={identityDraft.settings} onChange={(value) => setIdentityDraft((current) => ({ ...current, settings: value }))} />
                    <Button type="button" onClick={saveIdentity} disabled={Boolean(busy)}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Personality
                    </Button>
                  </div>
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

function JsonEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <textarea className={textareaClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
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
}: {
  files: BotIdentityFile[];
  fileDraft: BotIdentityFile;
  setFileDraft: (file: BotIdentityFile) => void;
  onSave: () => void;
  busy: boolean;
  defaultKind?: BotFileKind;
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
              {fileKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
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
