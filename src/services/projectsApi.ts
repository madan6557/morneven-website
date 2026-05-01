import type { Project } from "@/types";
import { db, delay, STORAGE_KEYS, writeCollection } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";

export type ProjectSort = "title" | "title-desc" | "status";

export interface ProjectPageParams extends PaginationParams {
  sort?: ProjectSort;
  status?: Project["status"];
  archived?: boolean;
}

export async function getProjects(): Promise<Project[]> {
  await delay();
  return [...db.projects];
}

export async function getProjectsPage(params: ProjectPageParams = {}): Promise<PaginatedResponse<Project>> {
  await delay();
  const { ids, page, pageSize, search, sort, status, archived } = params;
  let items = pickByIds([...db.projects], ids);

  if (status) items = items.filter((item) => item.status === status);
  if (archived !== undefined) items = items.filter((item) => Boolean(item.archived) === archived);
  items = items.filter((item) => matchesSearch(search, [item.title, item.status, item.shortDesc]));

  if (sort) {
    items = [...items].sort((a, b) => {
      if (sort === "status") return a.status.localeCompare(b.status);
      if (sort === "title-desc") return b.title.localeCompare(a.title);
      return a.title.localeCompare(b.title);
    });
  }

  return paginateCollection(items, { page, pageSize });
}

export async function getProject(id: string): Promise<Project | undefined> {
  await delay();
  return db.projects.find((p) => p.id === id);
}

export async function createProject(project: Omit<Project, "id">): Promise<Project> {
  await delay();
  const newProject = { ...project, id: `proj-${Date.now()}` };
  db.projects = [newProject, ...db.projects];
  writeCollection(STORAGE_KEYS.projects, db.projects);
  return newProject;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
  await delay();
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  db.projects[idx] = { ...db.projects[idx], ...data };
  writeCollection(STORAGE_KEYS.projects, db.projects);
  return db.projects[idx];
}

export async function deleteProject(id: string): Promise<boolean> {
  await delay();
  const len = db.projects.length;
  db.projects = db.projects.filter((p) => p.id !== id);
  writeCollection(STORAGE_KEYS.projects, db.projects);
  return db.projects.length < len;
}
