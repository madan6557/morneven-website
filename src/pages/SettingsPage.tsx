import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { ContentState } from "@/components/ContentState";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { showValidation } from "@/components/ui/validation-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { PERSONNEL_TRACKS } from "@/lib/pl";
import {
  getSystemChatSnapshotRemote,
  reconcileSystemChatGroupsRemote,
  type ChatReconciliationReport,
} from "@/services/chatApi";
import { getQuota, monthKey, pl2Status, pl3Status, pl4Status, yearKey } from "@/services/managementApi";
import {
  clearExtractionHistory,
  downloadExtractionJob,
  listExtractionHistoryRemote,
  startExtractionRemote,
  type ExtractionJob,
  type ExtractionMode,
} from "@/services/extractionService";
import { changePassword, deleteAccount } from "@/services/accountApi";
import {
  getStorageCleanupReportRemote,
  runStorageCleanupRemote,
  type StorageCleanupReport,
} from "@/services/storageCleanupService";
import { cn } from "@/lib/utils";

const emptyChatReport: ChatReconciliationReport = {
  instituteGroups: 0,
  divisionGroups: 0,
  teamGroups: 0,
  activeMemberships: 0,
  removedMemberships: 0,
  ranAt: new Date().toISOString(),
};

export default function SettingsPage() {
  const { role, username, personnelLevel, track, verifyPassword, logout } = useAuth();
  const { toast } = useToast();
  const [quota, setQuota] = useState<{ pl2: number; pl3: number; pl4: number } | null>(null);
  const [history, setHistory] = useState<ExtractionJob[]>([]);
  const [mode, setMode] = useState<ExtractionMode>("all");
  const [autoDownload, setAutoDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [showExtractionPassword, setShowExtractionPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [chatReport, setChatReport] = useState<ChatReconciliationReport>(emptyChatReport);
  const [storageCleanupReport, setStorageCleanupReport] = useState<StorageCleanupReport | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [shouldPollExtraction, setShouldPollExtraction] = useState(false);
  const [quotaLoading, setQuotaLoading] = useState(role !== "guest");
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(personnelLevel >= 7);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(personnelLevel >= 7);
  const [chatError, setChatError] = useState<string | null>(null);
  const [storageLoading, setStorageLoading] = useState(personnelLevel >= 7);
  const [storageError, setStorageError] = useState<string | null>(null);
  const processing = useMemo(() => history.some((job) => job.status === "processing"), [history]);

  useEffect(() => {
    if (personnelLevel < 7) {
      setHistory([]);
      setHistoryLoading(false);
      setHistoryError(null);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    listExtractionHistoryRemote()
      .then((items) => {
        setHistory(items);
        setShouldPollExtraction(items.some((job) => job.status === "processing"));
      })
      .catch((error) => {
        setHistoryError(toUserFacingError(error, "Extraction history could not be loaded."));
      })
      .finally(() => setHistoryLoading(false));
  }, [personnelLevel]);

  useEffect(() => {
    if (personnelLevel < 7) {
      setChatReport(emptyChatReport);
      setChatLoading(false);
      setChatError(null);
      return;
    }
    setChatLoading(true);
    setChatError(null);
    getSystemChatSnapshotRemote()
      .then(setChatReport)
      .catch((error) => {
        setChatError(toUserFacingError(error, "System chat status could not be loaded."));
      })
      .finally(() => setChatLoading(false));
  }, [personnelLevel]);

  useEffect(() => {
    if (personnelLevel < 7) {
      setStorageCleanupReport(null);
      setStorageLoading(false);
      setStorageError(null);
      return;
    }
    setStorageLoading(true);
    setStorageError(null);
    getStorageCleanupReportRemote()
      .then(setStorageCleanupReport)
      .catch((error) => {
        setStorageError(toUserFacingError(error, "Storage cleanup status could not be loaded."));
      })
      .finally(() => setStorageLoading(false));
  }, [personnelLevel]);

  useEffect(() => {
    if (!shouldPollExtraction || !processing) {
      if (shouldPollExtraction && !processing) setShouldPollExtraction(false);
      return;
    }
    const timer = window.setInterval(() => {
      listExtractionHistoryRemote().then((nextHistory) => {
        setHistory(nextHistory);
        setHistoryError(null);
        if (!nextHistory.some((job) => job.status === "processing")) {
          setShouldPollExtraction(false);
        }
      }).catch((error) => {
        setHistoryError(toUserFacingError(error, "Extraction history could not be refreshed."));
        setShouldPollExtraction(false);
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [processing, shouldPollExtraction]);

  useEffect(() => {
    if (role === "guest") {
      setQuota(null);
      setQuotaLoading(false);
      setQuotaError(null);
      return;
    }

    setQuotaLoading(true);
    setQuotaError(null);
    getQuota(username)
      .then((nextQuota) =>
        setQuota({
          pl2: pl2Status(nextQuota).count,
          pl3: pl3Status(nextQuota).count,
          pl4: pl4Status(nextQuota).count,
        }),
      )
      .catch((error) => {
        setQuota(null);
        setQuotaError(toUserFacingError(error, "Obligation status could not be loaded."));
      })
      .finally(() => setQuotaLoading(false));
  }, [role, username]);

  const trackInfo = PERSONNEL_TRACKS.find((item) => item.key === track);
  const title = trackInfo?.titles[personnelLevel] ?? "Unknown";
  const canRun = personnelLevel >= 7 && confirmText === "CONFIRM" && verifyPassword(password);
  const canReconcileChat = personnelLevel >= 7;
  const hasMaintenanceAccess = personnelLevel >= 7;
  const inputClass = "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:ring-1 focus:ring-primary";
  const helperTextClass = "text-sm leading-6 text-muted-foreground";

  const loadExtractionHistory = async () => {
    if (personnelLevel < 7) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const nextHistory = await listExtractionHistoryRemote();
      setHistory(nextHistory);
      setShouldPollExtraction(nextHistory.some((job) => job.status === "processing"));
    } catch (error) {
      setHistoryError(toUserFacingError(error, "Extraction history could not be loaded."));
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadQuota = async () => {
    if (role === "guest") return;
    setQuotaLoading(true);
    setQuotaError(null);
    try {
      const nextQuota = await getQuota(username);
      setQuota({
        pl2: pl2Status(nextQuota).count,
        pl3: pl3Status(nextQuota).count,
        pl4: pl4Status(nextQuota).count,
      });
    } catch (error) {
      setQuota(null);
      setQuotaError(toUserFacingError(error, "Obligation status could not be loaded."));
    } finally {
      setQuotaLoading(false);
    }
  };

  const loadChatReport = async () => {
    if (personnelLevel < 7) return;
    setChatLoading(true);
    setChatError(null);
    try {
      setChatReport(await getSystemChatSnapshotRemote());
    } catch (error) {
      setChatError(toUserFacingError(error, "System chat status could not be loaded."));
    } finally {
      setChatLoading(false);
    }
  };

  const refreshStorageCleanupReport = async () => {
    setStorageLoading(true);
    setStorageError(null);
    try {
      const report = await getStorageCleanupReportRemote();
      setStorageCleanupReport(report);
    } catch (error) {
      setStorageError(toUserFacingError(error, "Storage cleanup status could not be loaded."));
      throw error;
    } finally {
      setStorageLoading(false);
    }
  };

  const executeStorageCleanup = async () => {
    const report = await runStorageCleanupRemote();
    setStorageCleanupReport(report);
    setStorageError(null);
  };

  const runChatReconciliation = async () => {
    if (!canReconcileChat || isReconciling) return;
    setIsReconciling(true);
    try {
      const previousReport = chatReport;
      const report = await reconcileSystemChatGroupsRemote();
      setChatReport(report);
      setChatError(null);
      const changed =
        report.instituteGroups !== previousReport.instituteGroups ||
        report.divisionGroups !== previousReport.divisionGroups ||
        report.teamGroups !== previousReport.teamGroups ||
        report.activeMemberships !== previousReport.activeMemberships ||
        report.removedMemberships !== previousReport.removedMemberships;

      if (!changed) {
        toast({
          title: "System chat already synced",
          description: "No membership or group count changed.",
        });
      } else {
        toast({
          title: "System chat groups synced",
          description: `Channels ${previousReport.instituteGroups + previousReport.divisionGroups + previousReport.teamGroups} to ${report.instituteGroups + report.divisionGroups + report.teamGroups}, active members ${previousReport.activeMemberships} to ${report.activeMemberships}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: toUserFacingError(error, "Backend rejected chat reconciliation."),
        variant: "destructive",
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const runWithFeedback = async (
    key: string,
    action: () => Promise<void>,
    successTitle: string,
    failureTitle: string,
  ) => {
    if (busyAction) return;
    setBusyAction(key);
    try {
      await action();
      toast({ title: successTitle });
    } catch (error) {
      toast({
        title: failureTitle,
        description: toUserFacingError(error, "The request could not be completed."),
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="w-full space-y-6 p-4 md:p-8 xl:p-10">
      <div className="space-y-3">
        <h1 className="font-display text-2xl tracking-[0.1em] text-primary">SETTINGS</h1>
        <div className="mecha-line w-32" />
        <p className={helperTextClass}>
          Control appearance, account security, clearance obligations, and high-risk maintenance actions from one operational page.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile icon={ShieldCheck} label="Clearance" value={`L${personnelLevel}`} description={title} />
        <SummaryTile icon={UsersRound} label="Track" value={trackInfo?.short ?? "N/A"} description={trackInfo?.label ?? "No active track"} />
        <SummaryTile icon={Sparkles} label="Role" value={role.toUpperCase()} description={`Signed in as ${username}`} />
      </div>

      <div
        className={cn(
          "grid w-full items-start gap-5",
          hasMaintenanceAccess
            ? "xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]"
            : "",
        )}
      >
        <div className={cn("space-y-5", !hasMaintenanceAccess && "grid gap-5 space-y-0 lg:grid-cols-2 xl:grid-cols-3")}>
          <SectionCard
            icon={Sparkles}
            title="Appearance"
            description="Adjust interface presentation and active theme."
          >
            <div className="flex items-center justify-between gap-4 rounded-sm border border-border/70 bg-background/45 p-3">
              <div className="space-y-1">
                <p className="font-heading text-sm tracking-[0.12em] text-foreground uppercase">Theme</p>
                <p className="text-sm text-muted-foreground">Switch between light and dark interface presets.</p>
              </div>
              <ThemeToggle />
            </div>
          </SectionCard>

          <SectionCard
            icon={UsersRound}
            title="Account Snapshot"
            description="Current identity, clearance, and role assignment for this session."
          >
            <div className="space-y-2 text-sm font-body">
              <Row label="Username" value={username} />
              <Row label="Role" value={role} strong />
              <Row label="Clearance" value={`L${personnelLevel}`} strong />
              <Row label="Track" value={`${trackInfo?.short} - ${trackInfo?.label}`} strong />
              <Row label="Title" value={title} />
            </div>
          </SectionCard>

          {role !== "guest" && (
            <SectionCard
              icon={DatabaseZap}
              title="Obligation Status"
              description="Track submission and supervision quotas attached to your current authority band."
            >
              {quotaLoading ? (
                <ContentState
                  kind="loading"
                  title="Loading obligation status"
                  description="Fetching current submission and supervision totals."
                  compact
                  className="bg-background/45"
                />
              ) : quotaError ? (
                <ContentState
                  kind="error"
                  title="Obligation status unavailable"
                  description={quotaError}
                  actionLabel="Retry"
                  onAction={() => { void loadQuota(); }}
                  compact
                  className="bg-background/45"
                />
              ) : personnelLevel >= 7 ? (
                <p className={helperTextClass}>PL7 Full Authority holds no submission, supervision, or clearance obligations.</p>
              ) : (
                <div className="space-y-2 text-sm font-body">
                  <Row label={`PL2 Personal (${monthKey()})`} value={`${quota?.pl2 ?? 0} / 1`} active={personnelLevel === 2} />
                  <Row label={`PL3 Team (${yearKey()})`} value={`${quota?.pl3 ?? 0} / 1`} active={personnelLevel === 3} />
                  <Row label={`PL4 Supervision (${yearKey()})`} value={`${quota?.pl4 ?? 0} / 2`} active={personnelLevel >= 4 && personnelLevel < 7} />
                </div>
              )}
            </SectionCard>
          )}

          {role !== "guest" && (
            <SectionCard
              icon={KeyRound}
              title="Account Security"
              description="Sensitive actions are grouped here so password changes and account deletion are easier to review before execution."
              className={cn("border-destructive/25", !hasMaintenanceAccess && "lg:col-span-2 xl:col-span-3")}
            >
              <div className="space-y-4">
                <div className="space-y-3 rounded-sm border border-border/70 bg-background/45 p-4">
                  <div className="space-y-1">
                    <p className="font-heading text-sm tracking-[0.12em] text-foreground uppercase">Change Password</p>
                    <p className="text-sm text-muted-foreground">Use a minimum of 12 characters for the replacement password.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <PasswordField
                      label="Current password"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      shown={showCurrentPassword}
                      onToggle={() => setShowCurrentPassword((value) => !value)}
                      placeholder="Current password"
                      className={inputClass}
                    />
                    <PasswordField
                      label="New password"
                      value={newPassword}
                      onChange={setNewPassword}
                      shown={showNewPassword}
                      onToggle={() => setShowNewPassword((value) => !value)}
                      placeholder="New password, min 12 characters"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto sm:min-w-48"
                      disabled={!currentPassword || newPassword.length < 12}
                      isLoading={busyAction === "password"}
                      loadingText="Changing..."
                      onClick={() => showValidation({
                        variant: "warning",
                        title: "Change password",
                        description: "Your current session may be refreshed after the password changes.",
                        confirmLabel: "Change password",
                        cancelLabel: "Cancel",
                        onConfirm: async () => {
                          await runWithFeedback("password", async () => {
                            await changePassword(currentPassword, newPassword);
                            setCurrentPassword("");
                            setNewPassword("");
                          }, "Password changed", "Password change failed");
                        },
                      })}
                    >
                      Change Password
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 rounded-sm border border-destructive/30 bg-destructive/5 p-4">
                  <div className="space-y-1">
                    <p className="font-heading text-sm tracking-[0.12em] text-destructive uppercase">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      This action is irreversible and should only be used when backend cleanup policy has been confirmed.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <PasswordField
                      label="Account password"
                      value={deletePassword}
                      onChange={setDeletePassword}
                      shown={showDeletePassword}
                      onToggle={() => setShowDeletePassword((value) => !value)}
                      placeholder="Account password"
                      className={inputClass}
                    />
                    <LabeledInput
                      label="Confirmation phrase"
                      value={deleteConfirm}
                      onChange={setDeleteConfirm}
                      placeholder='Type "DELETE"'
                      className={inputClass}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="w-full sm:w-auto sm:min-w-48"
                      disabled={!deletePassword || deleteConfirm !== "DELETE"}
                      isLoading={busyAction === "delete-account"}
                      loadingText="Deleting..."
                      onClick={() => showValidation({
                        variant: "error",
                        title: "Delete account",
                        description: "This action is irreversible. Your account access will be removed.",
                        confirmLabel: "Delete account",
                        cancelLabel: "Cancel",
                        critical: true,
                        confirmDelaySeconds: 5,
                        onConfirm: async () => {
                          await runWithFeedback("delete-account", async () => {
                            await deleteAccount(deletePassword);
                            logout();
                          }, "Account deleted", "Account deletion failed");
                        },
                      })}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        {hasMaintenanceAccess && (
        <div className="space-y-5">
          {canReconcileChat && (
            <SectionCard
              icon={ShieldCheck}
              title="System Chat Reconciliation"
              description="Rebuild institute, division, and team membership from the latest personnel records."
              className="border-primary/35"
              accentClass="text-primary"
            >
              {chatLoading ? (
                <ContentState
                  kind="loading"
                  title="Loading system chat status"
                  description="Fetching the latest channel and membership snapshot."
                  compact
                  className="bg-background/45"
                />
              ) : chatError ? (
                <ContentState
                  kind="error"
                  title="System chat status unavailable"
                  description={chatError}
                  actionLabel="Retry"
                  onAction={() => { void loadChatReport(); }}
                  compact
                  className="bg-background/45"
                />
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Use this when membership or system-managed channels appear out of sync with the backend.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isReconciling}
                      isLoading={isReconciling}
                      loadingText="Syncing..."
                      onClick={() => showValidation({
                        variant: "warning",
                        title: "Sync system chat groups",
                        description: "This will reconcile institute, division, and team chat memberships from backend personnel and team data.",
                        confirmLabel: "Sync groups",
                        cancelLabel: "Cancel",
                        critical: true,
                        confirmDelaySeconds: 5,
                        onConfirm: runChatReconciliation,
                      })}
                      className="gap-2 sm:min-w-36"
                    >
                      {!isReconciling && <RefreshCw className="h-4 w-4" />}
                      Sync Groups
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric icon={DatabaseZap} label="System channels" value={chatReport.instituteGroups + chatReport.divisionGroups + chatReport.teamGroups} />
                    <Metric icon={UsersRound} label="Active members" value={chatReport.activeMemberships} />
                    <Metric icon={CheckCircle2} label="Team groups" value={chatReport.teamGroups} />
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <span>Institute groups: {chatReport.instituteGroups}</span>
                    <span>Division groups: {chatReport.divisionGroups}</span>
                    <span>Removed memberships: {chatReport.removedMemberships}</span>
                    <span>Last sync: {new Date(chatReport.ranAt).toLocaleString()}</span>
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {hasMaintenanceAccess && (
            <SectionCard
              icon={HardDrive}
              title="PL7 Storage Cleanup"
              description="Inspect object storage health, detect orphans, and run controlled cleanup when records no longer reference a file."
              className="border-primary/35"
              accentClass="text-primary"
            >
              {storageLoading && !storageCleanupReport ? (
                <ContentState
                  kind="loading"
                  title="Loading storage cleanup status"
                  description="Inspecting object storage references and orphan counts."
                  compact
                  className="bg-background/45"
                />
              ) : storageError && !storageCleanupReport ? (
                <ContentState
                  kind="error"
                  title="Storage cleanup status unavailable"
                  description={storageError}
                  actionLabel="Retry"
                  onAction={() => { void refreshStorageCleanupReport(); }}
                  compact
                  className="bg-background/45"
                />
              ) : (
                <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Detached files are auto-pruned during normal content replacement, but this tool is still needed for older or manually orphaned objects.
                  </p>
                  {storageCleanupReport?.automaticCleanup.enabled && (
                    <p className="text-sm text-muted-foreground">
                      Auto cleanup active for: {storageCleanupReport.automaticCleanup.scopes.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-44">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full justify-center"
                    isLoading={busyAction === "storage-report"}
                    loadingText="Scanning..."
                    onClick={() => runWithFeedback("storage-report", refreshStorageCleanupReport, "Storage scan completed", "Storage scan failed")}
                  >
                    <RefreshCw className="h-4 w-4" /> Scan Storage
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="w-full justify-center"
                    disabled={!storageCleanupReport || storageCleanupReport.orphanedObjects === 0}
                    isLoading={busyAction === "storage-run"}
                    loadingText="Cleaning..."
                    onClick={() => showValidation({
                      variant: "warning",
                      title: "Run storage cleanup",
                      description: `Delete ${storageCleanupReport?.orphanedObjects ?? 0} orphaned storage object(s) that are no longer referenced by backend data?`,
                      confirmLabel: "Run cleanup",
                      cancelLabel: "Cancel",
                      critical: true,
                      confirmDelaySeconds: 5,
                      onConfirm: async () => {
                        await runWithFeedback("storage-run", executeStorageCleanup, "Storage cleanup completed", "Storage cleanup failed");
                      },
                    })}
                  >
                    <Trash2 className="h-4 w-4" /> Run Cleanup
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <Metric icon={HardDrive} label="Scanned objects" value={storageCleanupReport?.totalObjects ?? 0} />
                <Metric icon={CheckCircle2} label="Referenced" value={storageCleanupReport?.referencedObjects ?? 0} />
                <Metric icon={AlertTriangle} label="Orphaned" value={storageCleanupReport?.orphanedObjects ?? 0} />
                <Metric icon={Trash2} label="Deleted" value={storageCleanupReport?.deletedObjects ?? 0} />
              </div>

              {storageCleanupReport && (
                <>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <span>Total size: {formatBytes(storageCleanupReport.totalBytes)}</span>
                    <span>Referenced size: {formatBytes(storageCleanupReport.referencedBytes)}</span>
                    <span>Orphaned size: {formatBytes(storageCleanupReport.orphanedBytes)}</span>
                    <span>Deleted size: {formatBytes(storageCleanupReport.deletedBytes)}</span>
                    <span>Last scan: {new Date(storageCleanupReport.scannedAt).toLocaleString()}</span>
                    <span>Folders tracked: {storageCleanupReport.folders.length}</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-heading tracking-[0.12em] text-foreground uppercase">Folder Summary</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {storageCleanupReport.folders.map((folder) => (
                        <div key={folder.folder} className="hud-border-sm bg-background/50 p-3 text-sm space-y-1">
                          <div className="font-heading tracking-[0.12em] text-primary uppercase">{folder.folder}</div>
                          <div className="text-muted-foreground">
                            {folder.referencedObjects} referenced / {folder.totalObjects} total
                          </div>
                          <div className={folder.orphanedObjects > 0 ? "text-amber-500" : "text-muted-foreground"}>
                            {folder.orphanedObjects} orphaned · {formatBytes(folder.orphanedBytes)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-heading tracking-[0.12em] text-foreground uppercase">Orphan Sample</p>
                          <p className="text-xs text-muted-foreground">
                            {storageCleanupReport.sampleOrphans.length} item{storageCleanupReport.sampleOrphans.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        {storageCleanupReport.sampleOrphans.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No orphaned storage object detected.</p>
                        ) : (
                          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                            {storageCleanupReport.sampleOrphans.map((entry) => (
                              <div key={entry.objectPath} className="rounded-sm border border-border bg-background/45 p-3 text-sm">
                                <div className="font-mono break-all leading-6 text-foreground">{entry.objectPath}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="rounded-sm border border-border/70 bg-background/60 px-2 py-1">{formatBytes(entry.size ?? 0)}</span>
                              {entry.lastModified ? (
                                <span className="rounded-sm border border-border/70 bg-background/60 px-2 py-1">
                                  {new Date(entry.lastModified).toLocaleString()}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
                </>
              )}
            </SectionCard>
          )}

          {hasMaintenanceAccess && (
            <SectionCard
              icon={AlertTriangle}
              title="PL7 Data Extraction"
              description="Queue background archive jobs for DB or asset export. Requires account password and CONFIRM phrase."
              className="border-amber-500/40"
              accentClass="text-amber-500"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <p className="text-sm text-muted-foreground">History is retained for 30 days, and completed jobs can be downloaded again while still valid.</p>
                {processing && <p className="text-sm text-muted-foreground">Extraction in progress...</p>}
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_12rem] xl:items-end">
                <div className="space-y-2">
                  <div className="space-y-2">
                    <label className="text-xs font-heading tracking-[0.12em] text-muted-foreground uppercase">Extraction Mode</label>
                    <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value as ExtractionMode)}>
                      <option value="all">All (DB + Images)</option>
                      <option value="db">DB Data per category JSON</option>
                      <option value="images">Images category manifest</option>
                    </select>
                  </div>
                </div>

                <PasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  shown={showExtractionPassword}
                  onToggle={() => setShowExtractionPassword((value) => !value)}
                  placeholder="Account password"
                  className={inputClass}
                />

                <LabeledInput
                  label="Confirmation"
                  value={confirmText}
                  onChange={setConfirmText}
                  placeholder='Type "CONFIRM"'
                  className={inputClass}
                />
                <Button
                  type="button"
                  className="w-full xl:self-end"
                  disabled={!canRun}
                  isLoading={busyAction === "start-extraction"}
                  loadingText="Starting..."
                  onClick={() => showValidation({
                    variant: "warning",
                    title: "Start data extraction",
                    description: "This creates a backend extraction job and prepares downloadable archive data.",
                    confirmLabel: "Start extraction",
                    cancelLabel: "Cancel",
                    critical: true,
                    confirmDelaySeconds: 5,
                    onConfirm: async () => {
                      await runWithFeedback("start-extraction", async () => {
                        const job = await startExtractionRemote(mode, autoDownload, { confirmText, password });
                        setHistory((current) => [job, ...current]);
                        setShouldPollExtraction(job.status === "processing");
                      }, "Extraction started", "Extraction failed");
                    },
                  })}
                >
                  Start Extraction
                </Button>
              </div>

              <label className="flex items-start gap-2 rounded-sm border border-border/70 bg-background/35 px-3 py-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoDownload}
                  onChange={(e) => setAutoDownload(e.target.checked)}
                  className="mt-1"
                />
                <span>Auto download when completed</span>
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-heading tracking-[0.12em] text-foreground uppercase">Extraction History</p>
                  <p className="text-sm text-muted-foreground">{history.length} job{history.length === 1 ? "" : "s"}</p>
                </div>
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {historyLoading ? (
                    <ContentState
                      kind="loading"
                      title="Loading extraction history"
                      description="Fetching recent archive jobs."
                      compact
                      className="bg-background/45"
                    />
                  ) : historyError ? (
                    <ContentState
                      kind="error"
                      title="Extraction history unavailable"
                      description={historyError}
                      actionLabel="Retry"
                      onAction={() => { void loadExtractionHistory(); }}
                      compact
                      className="bg-background/45"
                    />
                  ) : history.length === 0 ? (
                    <ContentState
                      kind="empty"
                      title="No extraction jobs yet"
                      description="Start a new export when archive data needs to be packaged."
                      compact
                      className="bg-background/45"
                    />
                  ) : history.map((job) => (
                    <div key={job.id} className="rounded-sm border border-border bg-background/45 p-3 text-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <label className="inline-flex items-center gap-2 text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={selected.includes(job.id)}
                              onChange={(event) => setSelected((current) => event.target.checked ? [...current, job.id] : current.filter((jobId) => jobId !== job.id))}
                            />
                            Select job
                          </label>
                          <p className="break-words text-foreground">
                            {job.mode.toUpperCase()} / {job.status} / expires {new Date(job.expiresAt).toLocaleDateString()}
                          </p>
                          {job.progress && (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span className="uppercase tracking-[0.12em]">{job.progress.stage}</span>
                                <span className="font-display text-foreground">{job.progress.percent}%</span>
                              </div>
                              <Progress value={job.progress.percent} className="h-2 bg-muted/70" />
                              <p className="text-xs leading-5 text-muted-foreground">{job.progress.message}</p>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0">
                          {job.status === "completed" && (
                            <button
                              type="button"
                              className="text-sm text-primary underline underline-offset-4 disabled:cursor-wait disabled:opacity-60"
                              disabled={busyAction === `download-${job.id}`}
                              onClick={() => runWithFeedback(
                                `download-${job.id}`,
                                () => downloadExtractionJob(job),
                                "Download started",
                                "Download failed",
                              )}
                            >
                              {busyAction === `download-${job.id}` ? "Downloading..." : "Download ZIP"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:min-w-40 sm:w-auto"
                  disabled={selected.length === 0}
                  isLoading={busyAction === "clear-selected"}
                  loadingText="Clearing..."
                  onClick={() => showValidation({
                    variant: "warning",
                    title: "Clear selected extraction jobs",
                    description: `Clear ${selected.length} selected history item(s)?`,
                    confirmLabel: "Clear selected",
                    cancelLabel: "Cancel",
                    dontShowAgainKey: "clear_selected_extractions",
                    onConfirm: async () => {
                      await runWithFeedback("clear-selected", async () => {
                        await clearExtractionHistory(selected);
                        setSelected([]);
                        setHistory((current) => current.filter((job) => !selected.includes(job.id)));
                      }, "Selected extraction history cleared", "Clear selected failed");
                    },
                  })}
                >
                  Clear selected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:min-w-40 sm:w-auto"
                  isLoading={busyAction === "clear-all"}
                  loadingText="Clearing..."
                  onClick={() => showValidation({
                    variant: "error",
                    title: "Clear all extraction history",
                    description: "This clears all extraction history visible to this account.",
                    confirmLabel: "Clear all",
                    cancelLabel: "Cancel",
                    critical: true,
                    confirmDelaySeconds: 5,
                    onConfirm: async () => {
                      await runWithFeedback("clear-all", async () => {
                        await clearExtractionHistory();
                        setSelected([]);
                        setHistory([]);
                      }, "Extraction history cleared", "Clear all failed");
                    },
                  })}
                >
                  Clear all
                </Button>
              </div>
            </SectionCard>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function toUserFacingError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error.message === "Failed to fetch") return "Network request failed.";
  return error.message || fallback;
}

function Row({ label, value, active = true, strong = false }: { label: string; value: string; active?: boolean; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-display text-xs tracking-wider text-primary uppercase" : active ? "text-foreground" : "text-muted-foreground"}>{value}</span>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="hud-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-accent-orange">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-heading tracking-[0.12em] uppercase">{label}</span>
      </div>
      <div className="space-y-1">
        <p className="font-display text-xl tracking-[0.08em] text-primary">{value}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
  accentClass = "text-accent-orange",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  accentClass?: string;
}) {
  return (
    <section className={cn("hud-border bg-card p-5 space-y-5", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", accentClass)} />
          <h3 className={cn("font-heading text-sm tracking-[0.15em] uppercase", accentClass)}>{title}</h3>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-heading tracking-[0.12em] text-muted-foreground uppercase">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  shown,
  onToggle,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggle: () => void;
  placeholder: string;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-heading tracking-[0.12em] text-muted-foreground uppercase">{label}</label>
      <div className="relative">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(className, "pr-10")}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function Metric({ icon: Icon, label, value }: { icon: typeof DatabaseZap; label: string; value: number }) {
  return (
    <div className="hud-border-sm flex min-h-[108px] flex-col justify-between bg-background/50 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-accent-orange" />
        <span className="text-xs uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="mt-3 break-all font-display text-xl leading-tight text-primary">{value.toLocaleString()}</div>
    </div>
  );
}


