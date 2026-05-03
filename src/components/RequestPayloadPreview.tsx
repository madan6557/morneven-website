import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { getProxyUrl } from "@/services/fileProxyService";
import type { MgmtRequest } from "@/services/managementApi";
import {
  ArrowRight,
  ImageIcon,
  Briefcase,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Users,
  FileText,
} from "lucide-react";

/**
 * Human-readable preview of a management request payload.
 * Replaces the previous raw-JSON `<pre>` block with a typed, friendly card
 * showing thumbnails, titles, target tracks/levels, and other key fields.
 */
export default function RequestPayloadPreview({ req }: { req: MgmtRequest }) {
  const p = req.payload ?? {};

  switch (req.kind) {
    case "transfer": {
      const target = String(p.targetTrack ?? "").toUpperCase();
      return (
        <Row icon={<ArrowRight className="h-3.5 w-3.5" />} label="Transfer">
          <Badge variant="outline" className="text-[10px]">{req.requesterTrack.toUpperCase()}</Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge className="text-[10px]">{target || "—"}</Badge>
        </Row>
      );
    }

    case "clearance": {
      const target = p.targetLevel as number | undefined;
      return (
        <Row icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Clearance">
          <Badge variant="outline" className="text-[10px]">L{req.requesterLevel}</Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge className="text-[10px]">L{target ?? "?"}</Badge>
          <span className="text-[10px] text-muted-foreground">{req.requesterTrack.toUpperCase()}</span>
        </Row>
      );
    }

    case "executive_promotion": {
      const plan = String(p.plan ?? "");
      return (
        <div className="space-y-2">
          <Row icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Executive Promotion">
            <Badge variant="outline" className="text-[10px]">L{req.requesterLevel}</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge className="text-[10px]">L{(p.targetLevel as number) ?? 5}</Badge>
          </Row>
          {plan && (
            <div className="border border-border rounded-sm p-2 bg-muted/30">
              <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Strategic Plan
              </p>
              <p className="text-xs font-body text-foreground/90 whitespace-pre-wrap line-clamp-6">{plan}</p>
            </div>
          )}
        </div>
      );
    }

    case "team_change": {
      const action = p.action as "add" | "remove" | undefined;
      const Icon = action === "remove" ? UserMinus : UserPlus;
      return (
        <Row icon={<Users className="h-3.5 w-3.5" />} label="Team Change">
          <Badge variant="outline" className="text-[10px] gap-1 inline-flex items-center">
            <Icon className="h-3 w-3" /> {action ?? "?"}
          </Badge>
          <span className="text-xs font-body text-foreground">{String(p.member ?? "—")}</span>
          <span className="text-[10px] text-muted-foreground">team #{String(p.teamId ?? "?")}</span>
        </Row>
      );
    }

    case "submission_personal": {
      const item = (p.item ?? {}) as {
        title?: string; thumbnail?: string; caption?: string; type?: string; tags?: string[];
      };
      return (
        <div className="flex gap-3 border border-border rounded-sm p-2 bg-muted/30">
          {item.thumbnail ? (
            <img
              src={getProxyUrl(item.thumbnail)}
              alt={item.title ?? "submission"}
              className="w-20 h-20 rounded-sm object-cover bg-background flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-sm bg-background flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
              Personal Submission · {item.type ?? "image"}
            </p>
            <p className="text-sm font-heading text-foreground truncate">{item.title ?? "(untitled)"}</p>
            {item.caption && (
              <p className="text-xs font-body text-foreground/80 line-clamp-2">{item.caption}</p>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {item.tags.map((t) => (
                  <span key={t} className="text-[10px] font-body bg-background px-1.5 py-0.5 rounded-sm">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    case "submission_team": {
      const project = (p.project ?? {}) as {
        title?: string; thumbnail?: string; shortDesc?: string; status?: string;
      };
      const teamId = p.teamId as string | undefined;
      return (
        <div className="flex gap-3 border border-border rounded-sm p-2 bg-muted/30">
          {project.thumbnail ? (
            <img
              src={getProxyUrl(project.thumbnail)}
              alt={project.title ?? "project"}
              className="w-20 h-20 rounded-sm object-cover bg-background flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-sm bg-background flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-6 w-6 text-muted-foreground/60" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
              Team Project{project.status ? ` · ${project.status}` : ""}
              {teamId ? ` · team #${teamId}` : ""}
            </p>
            <p className="text-sm font-heading text-foreground truncate">{project.title ?? "(untitled)"}</p>
            {project.shortDesc && (
              <p className="text-xs font-body text-foreground/80 line-clamp-2">{project.shortDesc}</p>
            )}
            <Link
              to="/projects"
              className="inline-block text-[10px] font-display tracking-wider text-primary hover:underline pt-1"
            >
              View Projects →
            </Link>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="flex items-center gap-1 text-[10px] font-display tracking-wider text-muted-foreground uppercase">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}
