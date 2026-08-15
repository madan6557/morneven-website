import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isDesktopApp } from "@/services/desktop/runtime";
import {
  createWorkspace,
  getWorkspaceMeta,
  lockWorkspace,
  resetWorkspace,
  unlockWorkspace,
  type WorkspaceMeta,
} from "@/services/desktop/workspaceDb";
import { getLocalStatus } from "@/services/desktop/repository";
import { exportWorkspaceBundle, importWorkspaceBundle } from "@/services/desktop/bundle";
import { clearSyncSession } from "@/services/desktop/sync";
import { clearDesktopMediaUrls } from "@/services/desktop/media";
import { clearBlobUrlCache } from "@/services/fileProxyService";

interface DesktopWorkspaceState {
  isDesktop: boolean;
  unlocked: boolean;
  meta: WorkspaceMeta | null;
  pendingCount: number;
  conflictCount: number;
  lock: () => void;
  refresh: () => Promise<void>;
  create: (pin: string, username?: string) => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  reset: () => Promise<void>;
  exportBundle: (password: string) => Promise<Blob>;
  importBundle: (file: File, password: string, pin?: string) => Promise<void>;
}

const defaultState: DesktopWorkspaceState = {
  isDesktop: false,
  unlocked: true,
  meta: null,
  pendingCount: 0,
  conflictCount: 0,
  lock: () => undefined,
  refresh: async () => undefined,
  create: async () => undefined,
  unlock: async () => undefined,
  reset: async () => undefined,
  exportBundle: async () => new Blob(),
  importBundle: async () => undefined,
};

const DesktopWorkspaceContext = createContext<DesktopWorkspaceState>(defaultState);

function DesktopUnlock({
  hasWorkspace,
  onCreate,
  onUnlock,
  onImport,
  onReset,
}: {
  hasWorkspace: boolean;
  onCreate: (pin: string, username: string) => Promise<void>;
  onUnlock: (pin: string) => Promise<void>;
  onImport: (file: File, password: string, pin: string) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [username, setUsername] = useState("Local Author");
  const [bundlePassword, setBundlePassword] = useState("");
  const [bundleFile, setBundleFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Workspace action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-sm border border-border bg-card p-6 shadow-xl space-y-5">
        <div>
          <p className="font-display text-xs tracking-[0.25em] text-primary uppercase">Morneven Desktop</p>
          <h1 className="mt-2 font-heading text-2xl">{hasWorkspace ? "Unlock workspace" : "Create local workspace"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Konten lokal tetap tersedia ketika backend tidak aktif. PIN ini hanya berlaku untuk workspace di komputer ini.
          </p>
        </div>

        {!hasWorkspace ? (
          <label className="block text-sm">
            Author name
            <input className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
        ) : null}

        {hasWorkspace ? (
          <button
            type="button"
            disabled={busy}
            className="w-full rounded-sm border border-destructive/50 px-3 py-2 text-xs text-destructive disabled:opacity-50"
            onClick={() => run(async () => {
              if (!window.confirm("Reset this workspace? Local data can only be restored from an encrypted bundle.")) return;
              await onReset();
            })}
          >
            Reset workspace (delete local data)
          </button>
        ) : null}

        <label className="block text-sm">
          Local PIN
          <input autoFocus type="password" inputMode="numeric" className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2" value={pin} onChange={(event) => setPin(event.target.value)} />
        </label>

        {!hasWorkspace ? (
          <label className="block text-sm">
            Confirm PIN
            <input type="password" inputMode="numeric" className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} />
          </label>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            className="flex-1 rounded-sm bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            onClick={() => run(async () => {
              if (!hasWorkspace && pin !== confirmPin) throw new Error("PIN confirmation does not match.");
              if (hasWorkspace) await onUnlock(pin);
              else await onCreate(pin, username.trim() || "Local Author");
            })}
          >
            {busy ? "Working..." : hasWorkspace ? "Unlock" : "Create workspace"}
          </button>
        </div>

        {!hasWorkspace ? (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Restore an encrypted `.morneven` bundle</p>
            <input type="file" accept=".morneven,application/octet-stream" onChange={(event) => setBundleFile(event.target.files?.[0] ?? null)} className="w-full text-xs" />
            <input type="password" placeholder="Bundle password" className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm" value={bundlePassword} onChange={(event) => setBundlePassword(event.target.value)} />
            <button
              type="button"
              disabled={busy || !bundleFile || !bundlePassword || !pin}
              className="w-full rounded-sm border border-border px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => run(async () => onImport(bundleFile!, bundlePassword, pin))}
            >
              Import bundle
            </button>
          </div>
        ) : null}

        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </section>
    </main>
  );
}

export function DesktopWorkspaceGate({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<WorkspaceMeta | null>(null);
  const [unlocked, setUnlocked] = useState(!isDesktopApp);
  const [ready, setReady] = useState(!isDesktopApp);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    if (!isDesktopApp) return;
    getWorkspaceMeta().then((next) => {
      setMeta(next);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const refresh = async () => {
    if (!isDesktopApp || !unlocked) return;
    const status = await getLocalStatus();
    setPendingCount(status.pending);
    setConflictCount(status.conflicts);
    setMeta(await getWorkspaceMeta());
  };

  useEffect(() => {
    void refresh();
    // refresh intentionally reads the unlock state from its closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  useEffect(() => {
    if (!isDesktopApp || !unlocked) return;
    const handleWorkspaceChanged = () => { void refresh(); };
    window.addEventListener("morneven:workspace-changed", handleWorkspaceChanged);
    return () => window.removeEventListener("morneven:workspace-changed", handleWorkspaceChanged);
    // refresh intentionally reads the current unlock state from its closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const value = useMemo<DesktopWorkspaceState>(() => ({
    isDesktop: isDesktopApp,
    unlocked,
    meta,
    pendingCount,
    conflictCount,
    lock: () => {
      clearSyncSession();
      clearDesktopMediaUrls();
      clearBlobUrlCache();
      lockWorkspace();
      setUnlocked(false);
    },
    refresh,
    create: async (pin, username = "Local Author") => {
      const next = await createWorkspace(pin, { username, role: "author", track: "executive" });
      setMeta(next);
      setUnlocked(true);
    },
    unlock: async (pin) => {
      const next = await unlockWorkspace(pin);
      setMeta(next);
      setUnlocked(true);
    },
    reset: async () => {
      clearDesktopMediaUrls();
      clearBlobUrlCache();
      await resetWorkspace();
      setMeta(null);
      setUnlocked(false);
    },
    exportBundle: (password) => exportWorkspaceBundle(password),
    importBundle: async (file, password, pin) => {
      let createdForImport = false;
      if (!meta) {
        if (!pin) throw new Error("A new local PIN is required for import.");
        await createWorkspace(pin);
        createdForImport = true;
      }
      try {
        await importWorkspaceBundle(file, password);
      } catch (error) {
        if (createdForImport) await resetWorkspace();
        throw error;
      }
      setMeta(await getWorkspaceMeta());
      setUnlocked(true);
    },
  // Workspace actions are stable for the mounted gate; refresh is intentionally closure-bound.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [conflictCount, meta, pendingCount, unlocked]);

  if (!isDesktopApp) return <DesktopWorkspaceContext.Provider value={value}>{children}</DesktopWorkspaceContext.Provider>;
  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!unlocked) {
    return (
      <DesktopUnlock
        hasWorkspace={Boolean(meta)}
        onCreate={value.create}
        onUnlock={value.unlock}
        onImport={value.importBundle}
        onReset={value.reset}
      />
    );
  }
  return <DesktopWorkspaceContext.Provider value={value}>{children}</DesktopWorkspaceContext.Provider>;
}

export function useDesktopWorkspace() {
  return useContext(DesktopWorkspaceContext);
}
