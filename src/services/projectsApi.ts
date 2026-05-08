import type { Project } from "@/types";
import {
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, type BackendPage } from "@/services/restClient";

export type ProjectSort = "title" | "title-desc" | "status";

export interface ProjectPageParams extends PaginationParams {
  sort?: ProjectSort;
  status?: Project["status"];
  archived?: boolean;
}

export async function getProjects(): Promise<Project[]> {
  return unwrapPageItems(await apiRequest<Project[] | BackendPage<Project>>("/projects"));
}

export async function getProjectsPage(params: ProjectPageParams = {}): Promise<PaginatedResponse<Project>> {
  return toPageResponse(
    await apiRequest<Project[] | BackendPage<Project>>(`/projects${buildQuery({ ...params, q: params.search })}`),
    params,
  );
}

export async function getProject(id: string): Promise<Project | undefined> {
  return apiRequest<Project>(`/projects/${id}`);
}

export async function createProject(project: Omit<Project, "id">): Promise<Project> {
  return apiRequest<Project>("/projects", { method: "POST", body: project });
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
  return apiRequest<Project>(`/projects/${id}`, { method: "PUT", body: data });
}

export async function deleteProject(id: string): Promise<boolean> {
  await apiRequest(`/projects/${id}`, { method: "DELETE" });
  return true;
}
