import type { LoreMeta, Project } from "@/types";

const firstValue = (values: Array<unknown>) =>
  values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();

const teamLabel = (team: LoreMeta["team"]) => {
  if (Array.isArray(team)) return team.filter(Boolean).join(", ");
  return typeof team === "string" ? team.trim() : "";
};

export function projectCredit(project: Pick<Project, "meta" | "contributor">) {
  const meta = project.meta ?? {};
  return firstValue([
    teamLabel(meta.team),
    meta.owner,
    meta.creator,
    meta.designer,
    project.contributor,
  ]);
}
