import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseZap, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PERSONNEL_TRACKS } from "@/lib/pl";
import { getSystemChatSnapshot, reconcileAutoMemberships, reconcileSystemChatGroupsRemote, type ChatReconciliationReport } from "@/services/chatApi";
import { getQuota, listTeams, monthKey, pl2Status, pl3Status, pl4Status, yearKey } from "@/services/managementApi";
import { listPersonnel } from "@/services/personnelApi";
import { canUseLocalExtractionFallback, clearExtractionHistory, downloadExtractionJob, listExtractionHistory, listExtractionHistoryRemote, startExtraction, startExtractionRemote, type ExtractionMode } from "@/services/extractionService";
import { clearDemoIntegrationState, listDemoStateKeys } from "@/services/integrationCleanup";

export default function SettingsPage() {
  const { role, username, personnelLevel, track, verifyPassword } = useAuth();
  const { toast } = useToast();
  const [quota, setQuota] = useState<{ pl2: number; pl3: number; pl4: number } | null>(null);
  const [history, setHistory] = useState(listExtractionHistory());
  const [mode, setMode] = useState<ExtractionMode>("all");
  const [autoDownload, setAutoDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [chatReport, setChatReport] = useState<ChatReconciliationReport>(() => getSystemChatSnapshot());
  const [isReconciling, setIsReconciling] = useState(false);
  const processing = useMemo(() => history.some((h) => h.status === "processing"), [history]);

  useEffect(() => {
    listExtractionHistoryRemote().then(setHistory).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!processing) return;
    const t = window.setInterval(() => {
      listExtractionHistoryRemote().then(setHistory).catch(() => {
        setHistory(listExtractionHistory());
      });
    }, 3000);
    return () => window.clearInterval(t);
  }, [processing]);

  useEffect(() => {
    getQuota(username).then((q) =>
      setQuota({ pl2: pl2Status(q).count, pl3: pl3Status(q).count, pl4: pl4Status(q).count }),
    );
  }, [username]);

  const trackInfo = PERSONNEL_TRACKS.find((t) => t.key === track);
  const title = trackInfo?.titles[personnelLevel] ?? "Unknown";
  const canRun = personnelLevel >= 7 && confirmText === "CONFIRM" && verifyPassword(password);
  const canReconcileChat = personnelLevel >= 7;
  const demoStateKeyCount = listDemoStateKeys().length;

  const runChatReconciliation = async () => {
    if (!canReconcileChat || isReconciling) return;
    setIsReconciling(true);
    try {
      const report = await reconcileSystemChatGroupsRemote().catch(async () => {
        const [personnel, teams] = await Promise.all([listPersonnel(), listTeams()]);
        return reconcileAutoMemberships(
          personnel,
          teams.map((team) => ({
            id: team.id,
            name: team.name,
            leader: team.leader,
            members: team.members,
          })),
        );
      });
      setChatReport(report);
      toast({ title: "System chat groups synced", description: `${report.teamGroups ?? 0} team groups, ${report.divisionGroups ?? 0} division groups.` });
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">SETTINGS</h1>
      <div className="mecha-line w-32" />
      <div className="space-y-6 max-w-3xl">
        <section className="hud-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Appearance</h3>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-heading text-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </section>

        <section className="hud-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Account</h3>
          <div className="space-y-2 text-sm font-body">
            <Row label="Username" value={username} />
            <Row label="Role" value={role} strong />
            <Row label="Clearance" value={`L${personnelLevel}`} strong />
            <Row label="Track" value={`${trackInfo?.short} - ${trackInfo?.label}`} strong />
            <Row label="Title" value={title} />
          </div>
        </section>

        {role !== "guest" && (
          <section className="hud-border bg-card p-5 space-y-3">
            <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Obligation</h3>
            {personnelLevel >= 7 ? (
              <p className="text-xs text-muted-foreground">PL7 Full Authority holds no submission, supervision, or clearance obligations.</p>
            ) : (
              <div className="space-y-2 text-sm font-body">
                <Row label={`PL2 Personal (${monthKey()})`} value={`${quota?.pl2 ?? 0} / 1`} active={personnelLevel === 2} />
                <Row label={`PL3 Team (${yearKey()})`} value={`${quota?.pl3 ?? 0} / 1`} active={personnelLevel === 3} />
                <Row label={`PL4 Supervision (${yearKey()})`} value={`${quota?.pl4 ?? 0} / 2`} active={personnelLevel >= 4 && personnelLevel < 7} />
              </div>
            )}
          </section>
        )}

        {canReconcileChat && (
        <section className="hud-border bg-card p-5 space-y-5 border-primary/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-heading text-sm tracking-[0.15em] text-primary uppercase">System Chat Reconciliation</h3>
              </div>
              <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                Rebuilds institute, division, and team chat membership from the current personnel and team records.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={isReconciling}
              onClick={runChatReconciliation}
              className="gap-2 sm:min-w-36"
            >
              <RefreshCw className={`h-4 w-4 ${isReconciling ? "animate-spin" : ""}`} />
              Sync Groups
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={DatabaseZap} label="System channels" value={chatReport.instituteGroups + chatReport.divisionGroups + chatReport.teamGroups} />
            <Metric icon={UsersRound} label="Active members" value={chatReport.activeMemberships} />
            <Metric icon={CheckCircle2} label="Team groups" value={chatReport.teamGroups} />
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <span>Institute groups: {chatReport.instituteGroups}</span>
            <span>Division groups: {chatReport.divisionGroups}</span>
            <span>Removed memberships: {chatReport.removedMemberships}</span>
            <span>Last sync: {new Date(chatReport.ranAt).toLocaleString()}</span>
          </div>
        </section>
        )}

        {personnelLevel >= 7 && (
          <section className="hud-border bg-card p-5 space-y-4 border-primary/25">
            <div className="space-y-2">
              <h3 className="font-heading text-sm tracking-[0.15em] text-primary uppercase">Integration State Cleanup</h3>
              <p className="text-xs leading-5 text-muted-foreground">
                Removes local demo data keys before FE QA runs against backend REST. API tokens and theme preference are kept.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const result = clearDemoIntegrationState();
                toast({
                  title: "Demo state cleared",
                  description: `${result.removedKeys.length} of ${demoStateKeyCount} demo keys removed.`,
                });
                setHistory([]);
                setChatReport(getSystemChatSnapshot());
              }}
            >
              Clear Demo State
            </Button>
          </section>
        )}

        {personnelLevel >= 7 && (
          <section className="hud-border bg-card p-5 space-y-4 border-amber-500/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-heading text-sm tracking-[0.15em] text-amber-500 uppercase">PL7 Data Extraction</h3>
            </div>
            <div className="text-xs text-muted-foreground">Background processing with 30-day history retention. Requires account password and CONFIRM phrase.</div>
            <select className="w-full bg-background border rounded px-2 py-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value as ExtractionMode)}>
              <option value="all">All (DB + Images)</option>
              <option value="db">DB Data per category JSON</option>
              <option value="images">Images category manifest</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoDownload} onChange={(e) => setAutoDownload(e.target.checked)} /> Auto download when completed
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Account password" className="w-full bg-background border rounded px-2 py-2 text-sm" />
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder='Type "CONFIRM"' className="w-full bg-background border rounded px-2 py-2 text-sm" />
            <Button type="button" disabled={!canRun} onClick={async () => {
              try {
                const job = await startExtractionRemote(mode, autoDownload, { confirmText, password });
                setHistory([job, ...history]);
              } catch (error) {
                if (!canUseLocalExtractionFallback()) {
                  toast({
                    title: "Extraction failed",
                    description: error instanceof Error ? error.message : "Backend rejected the extraction request.",
                    variant: "destructive",
                  });
                  return;
                }
                startExtraction(mode, autoDownload);
                setHistory(listExtractionHistory());
              }
            }}>
              Start Extraction
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Extraction in progress...</p>}
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="border rounded p-2 text-xs flex items-center justify-between gap-2">
                  <div>
                    <label className="mr-2">
                      <input type="checkbox" checked={selected.includes(h.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, h.id] : prev.filter((id) => id !== h.id))} />
                    </label>
                    {h.mode.toUpperCase()} / {h.status} / expires {new Date(h.expiresAt).toLocaleDateString()}
                  </div>
                  <div>
                    {h.status === "completed" && (
                      <button
                        type="button"
                        className="underline text-primary"
                        onClick={() => {
                          downloadExtractionJob(h).catch((error) => {
                            toast({
                              title: "Download failed",
                              description: error instanceof Error ? error.message : "Could not download extraction archive.",
                              variant: "destructive",
                            });
                          });
                        }}
                      >
                        Download ZIP
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { clearExtractionHistory(selected); setSelected([]); setHistory(listExtractionHistory()); }}>Clear selected</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { clearExtractionHistory(); setSelected([]); setHistory([]); }}>Clear all</Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, active = true, strong = false }: { label: string; value: string; active?: boolean; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-display text-xs tracking-wider text-primary uppercase" : active ? "text-foreground" : "text-muted-foreground"}>{value}</span>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof DatabaseZap; label: string; value: number }) {
  return (
    <div className="hud-border-sm bg-background/50 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-accent-orange" />
        <span className="text-xs uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="mt-2 font-display text-xl text-primary">{value}</div>
    </div>
  );
}
