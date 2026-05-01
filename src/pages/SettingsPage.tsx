import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { PERSONNEL_TRACKS } from "@/lib/pl";
import { getQuota, pl2Status, pl3Status, pl4Status, monthKey, yearKey } from "@/services/managementApi";
import { clearExtractionHistory, listExtractionHistory, startExtraction, type ExtractionMode } from "@/services/extractionService";
import { AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { role, username, personnelLevel, track, verifyPassword } = useAuth();
  const [quota, setQuota] = useState<{ pl2: number; pl3: number; pl4: number } | null>(null);
  const [history, setHistory] = useState(listExtractionHistory());
  const [mode, setMode] = useState<ExtractionMode>("all");
  const [autoDownload, setAutoDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { const t = setInterval(() => setHistory(listExtractionHistory()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    getQuota(username).then((q) =>
      setQuota({ pl2: pl2Status(q).count, pl3: pl3Status(q).count, pl4: pl4Status(q).count }),
    );
  }, [username]);
  const trackInfo = PERSONNEL_TRACKS.find((t) => t.key === track);
  const title = trackInfo?.titles[personnelLevel] ?? "Unknown";
  const canRun = personnelLevel >= 7 && confirmText === "CONFIRM" && verifyPassword(password);
  const processing = useMemo(() => history.some((h) => h.status === "processing"), [history]);

  return <div className="p-6 md:p-8 space-y-6"><h1 className="font-display text-2xl tracking-[0.1em] text-primary">SETTINGS</h1><div className="mecha-line w-32" />
    <div className="space-y-6 max-w-3xl">
      <div className="hud-border bg-card p-5 space-y-4"><h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Appearance</h3><div className="flex items-center justify-between"><span className="text-sm font-heading text-foreground">Theme</span><ThemeToggle /></div></div>
      <div className="hud-border bg-card p-5 space-y-4"><h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Account</h3><div className="space-y-2 text-sm font-body"><div className="flex justify-between"><span className="text-muted-foreground">Username</span><span>{username}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-display text-xs tracking-wider text-primary uppercase">{role}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Clearance</span><span className="font-display text-xs tracking-wider text-primary uppercase">L{personnelLevel}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Track</span><span className="font-display text-xs tracking-wider text-primary uppercase">{trackInfo?.short} - {trackInfo?.label}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Title</span><span>{title}</span></div></div></div>
      {role !== "guest" && <div className="hud-border bg-card p-5 space-y-3"><h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Obligation</h3>{personnelLevel >= 7 ? <p className="text-xs text-muted-foreground">PL7 (Full Authority) holds no submission, supervision, or clearance obligations.</p> : <div className="space-y-2 text-sm font-body"><Row label={`PL2 Personal (${monthKey()})`} value={`${quota?.pl2 ?? 0} / 1`} active={personnelLevel === 2} /><Row label={`PL3 Team (${yearKey()})`} value={`${quota?.pl3 ?? 0} / 1`} active={personnelLevel === 3} /><Row label={`PL4 Supervision (${yearKey()})`} value={`${quota?.pl4 ?? 0} / 2`} active={personnelLevel >= 4 && personnelLevel < 7} /></div>}</div>}
      {personnelLevel >= 7 && <div className="hud-border bg-card p-5 space-y-4 border-amber-500/40"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><h3 className="font-heading text-sm tracking-[0.15em] text-amber-500 uppercase">PL7 Data Extraction</h3></div>
        <div className="text-xs text-muted-foreground">Background processing + 30-day history retention. Requires account password and CONFIRM phrase.</div>
        <select className="w-full bg-background border rounded px-2 py-2 text-sm" value={mode} onChange={(e)=>setMode(e.target.value as ExtractionMode)}><option value="all">All (DB + Images)</option><option value="db">DB Data per category JSON</option><option value="images">Images category manifest</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoDownload} onChange={(e)=>setAutoDownload(e.target.checked)} /> Auto download when completed</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Account password" className="w-full bg-background border rounded px-2 py-2 text-sm" />
        <input value={confirmText} onChange={(e)=>setConfirmText(e.target.value)} placeholder='Type "CONFIRM"' className="w-full bg-background border rounded px-2 py-2 text-sm" />
        <button disabled={!canRun} onClick={() => { startExtraction(mode, autoDownload); setHistory(listExtractionHistory()); }} className="px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-40">Start Extraction</button>
        {processing && <p className="text-xs text-muted-foreground">Extraction in progress...</p>}
        <div className="space-y-2">
          {history.map((h) => <div key={h.id} className="border rounded p-2 text-xs flex items-center justify-between gap-2"><div><label className="mr-2"><input type="checkbox" checked={selected.includes(h.id)} onChange={(e)=>setSelected((prev)=> e.target.checked ? [...prev, h.id] : prev.filter((id)=>id!==h.id))} /></label>{h.mode.toUpperCase()} · {h.status} · expires {new Date(h.expiresAt).toLocaleDateString()}</div><div>{h.status === "completed" && h.blobUrl && <a className="underline text-primary" href={h.blobUrl} download={h.downloadName}>Download ZIP</a>}</div></div>)}
        </div>
        <div className="flex gap-2"><button className="px-2 py-1 border rounded text-xs" onClick={()=>{ clearExtractionHistory(selected); setSelected([]); setHistory(listExtractionHistory()); }}>Clear selected</button><button className="px-2 py-1 border rounded text-xs" onClick={()=>{ clearExtractionHistory(); setSelected([]); setHistory([]); }}>Clear all</button></div>
      </div>}
    </div></div>;
}

function Row({ label, value, active }: { label: string; value: string; active: boolean }) {
  return <div className="flex justify-between"><span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span><span className={`font-display text-xs tracking-wider uppercase ${active ? "text-primary" : "text-muted-foreground"}`}>{value}</span></div>;
}
