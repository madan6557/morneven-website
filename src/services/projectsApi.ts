import type { Project } from "@/types";
import { db, delay, STORAGE_KEYS, writeCollection } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, withDemoFallback, type BackendPage } from "@/services/restClient";

export type ProjectSort = "title" | "title-desc" | "status";

export interface ProjectPageParams extends PaginationParams {
  sort?: ProjectSort;
  status?: Project["status"];
  archived?: boolean;
}

export async function getProjects(): Promise<Project[]> {
  return withDemoFallback(
    async () => unwrapPageItems(await apiRequest<Project[] | BackendPage<Project>>("/projects")),
    async () => {
      await delay();
      return [...db.projects];
    },
  );
}

export async function getProjectsPage(params: ProjectPageParams = {}): Promise<PaginatedResponse<Project>> {
  return withDemoFallback(
    async () => {
      const data = await apiRequest<Project[] | BackendPage<Project>>(
        `/projects${buildQuery({ ...params, q: params.search })}`,
      );
      return toPageResponse(data, params);
    },
    async () => {
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
    },
  );
}

export async function getProject(id: string): Promise<Project | undefined> {
  return withDemoFallback(
    () => apiRequest<Project>(`/projects/${id}`),
    async () => {
      await delay();
      return db.projects.find((p) => p.id === id);
    },
  );
}

export async function createProject(project: Omit<Project, "id">): Promise<Project> {
  return withDemoFallback(
    () => apiRequest<Project>("/projects", { method: "POST", body: project }),
    async () => {
      await delay();
      const newProject = { ...project, id: `proj-${Date.now()}` };
      db.projects = [newProject, ...db.projects];
      writeCollection(STORAGE_KEYS.projects, db.projects);
      return newProject;
    },
  );
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
  return apiRequest<Project>(`/projects/${id}`, { method: "PUT", body: data });
}

export async function deleteProject(id: string): Promise<boolean> {
  await apiRequest(`/projects/${id}`, { method: "DELETE" });
  return true;
}
