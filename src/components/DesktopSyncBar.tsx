import { useEffect, useRef, useState } from "react";
import { Download, Lock, RefreshCw, Upload, AlertTriangle } from "lucide-react";
import { useDesktopWorkspace } from "@/components/DesktopWorkspaceGate";
import { bootstrapWorkspace, clearSyncSession, hasSyncSession, loginForSync, resolveConflict, syncWorkspace } from "@/services/desktop/sync";
import { getWorkspaceMeta, listConflicts, type LocalConflict } from "@/services/desktop/workspaceDb";
import { getLocalStatus } from "@/services/desktop/repository";

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function DesktopSyncBar() {
  const workspace = useDesktopWorkspace();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [conflicts, setConflicts] = useState<LocalConflict[]>([]);

  const refreshConflicts = async () => setConflicts(await listConflicts());

  useEffect(() => {
    if (!workspace.isDesktop) return;
    void refreshConflicts();
    const handleOnline = () => {
      if (hasSyncSession()) void runSync();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
    // runSync intentionally reads the current workspace/session at event time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.isDesktop]);

  const runSync = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (!navigator.onLine) throw new Error("Backend is unavailable while offline.");
      if (!hasSyncSession()) {
        const email = window.prompt("Backend email for sync:");
        if (!email) return;
        const password = window.prompt("Backend password for sync:");
        if (!password) return;
        await loginForSync(email, password);
      }
      const currentMeta = await getWorkspaceMeta();
      const currentStatus = await getLocalStatus();
      if (currentMeta?.cursor === "0" && currentStatus.pending === 0 && currentStatus.conflicts === 0) {
        await bootstrapWorkspace();
        setMessage("Workspace bootstrapped.");
      } else {
        const result = await syncWorkspace();
        setMessage(`Sync complete: ${result.applied} applied, ${result.conflicts} conflicts.`);
      }
      await workspace.refresh();
      await refreshConflicts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  };

  const exportBundle = async () => {
    const password = window.prompt("Create an export password:");
    if (!password) return;
    setBusy(true);
    try {
      downloadBlob(await workspace.exportBundle(password), `morneven-${new Date().toISOString().slice(0, 10)}.morneven`);
      setMessage("Workspace exported.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const importBundle = async (file: File) => {
    const password = window.prompt("Bundle password:");
    if (!password) return;
    setBusy(true);
    try {
      await workspace.importBundle(file, password);
      await workspace.refresh();
      await refreshConflicts();
      setMessage("Workspace imported.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  if (!workspace.isDesktop || !workspace.unlocked) return null;

  return (
    <div className="border-b border-border/60 bg-card/70 px-3 py-2 text-[11px] font-display tracking-wider">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-1 text-primary">LOCAL ONLY</span>
        <span className="text-muted-foreground">PENDING {workspace.pendingCount}</span>
        {workspace.conflictCount > 0 ? <span className="text-destructive">CONFLICTS {workspace.conflictCount}</span> : null}
        {!hasSyncSession() ? <span className="text-muted-foreground">SYNC REQUIRES SIGN-IN</span> : null}
        <span className="text-muted-foreground">{workspace.meta?.lastSyncAt ? `LAST SYNC ${new Date(workspace.meta.lastSyncAt).toLocaleString()}` : "NOT SYNCED"}</span>
        <div className="ml-auto flex flex-wrap gap-1">
          <button type="button" disabled={busy} onClick={() => void runSync()} className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"><RefreshCw className="h-3 w-3" />SYNC</button>
          <button type="button" disabled={busy} onClick={() => void exportBundle()} className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"><Download className="h-3 w-3" />EXPORT</button>
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"><Upload className="h-3 w-3" />IMPORT</button>
          <button type="button" onClick={() => { clearSyncSession(); workspace.lock(); }} className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 hover:bg-muted"><Lock className="h-3 w-3" />LOCK</button>
          <input ref={fileInput} type="file" accept=".morneven,application/octet-stream" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBundle(file); }} />
        </div>
      </div>
      {message ? <p className="mt-1 text-muted-foreground">{message}</p> : null}
      {conflicts.length ? (
        <div className="mt-2 space-y-2 rounded-sm border border-destructive/40 bg-destructive/5 p-2">
          <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-3 w-3" />CONFLICT REVIEW</div>
          {conflicts.map((conflict) => (
            <div key={conflict.key} className="rounded-sm border border-border bg-background p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{conflict.entity.toUpperCase()} / {conflict.id}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => void resolveConflict(conflict, "local").then(() => Promise.all([workspace.refresh(), refreshConflicts()]))} className="rounded-sm border border-border px-2 py-1 hover:bg-muted">KEEP LOCAL</button>
                  <button type="button" onClick={() => void resolveConflict(conflict, "server").then(() => Promise.all([workspace.refresh(), refreshConflicts()]))} className="rounded-sm border border-border px-2 py-1 hover:bg-muted">KEEP SERVER</button>
                </div>
              </div>
              <div className="mt-1 grid gap-2 md:grid-cols-2">
                <pre className="max-h-28 overflow-auto whitespace-pre-wrap text-[10px] text-primary">{JSON.stringify(conflict.localRecord, null, 2)}</pre>
                <pre className="max-h-28 overflow-auto whitespace-pre-wrap text-[10px] text-accent-orange">{JSON.stringify(conflict.serverRecord, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
