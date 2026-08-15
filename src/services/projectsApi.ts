import type { Project } from "@/types";
import {
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, type BackendPage } from "@/services/restClient";
import { isDesktopApp } from "@/services/desktop/runtime";
import * as desktopRepository from "@/services/desktop/repository";

export type ProjectSort = "title" | "title-desc" | "status";

export interface ProjectPageParams extends PaginationParams {
  sort?: ProjectSort;
  status?: Project["status"];
  archived?: boolean;
}

export async function getProjects(): Promise<Project[]> {
  if (isDesktopApp) return desktopRepository.getProjects();
  return unwrapPageItems(await apiRequest<Project[] | BackendPage<Project>>("/projects"));
}

export async function getProjectsPage(params: ProjectPageParams = {}): Promise<PaginatedResponse<Project>> {
  if (isDesktopApp) return desktopRepository.getProjectsPage(params);
  return toPageResponse(
    await apiRequest<Project[] | BackendPage<Project>>(`/projects${buildQuery({ ...params, q: params.search })}`),
    params,
  );
}

export async function getProject(id: string): Promise<Project | undefined> {
  if (isDesktopApp) return desktopRepository.getProject(id);
  return apiRequest<Project>(`/projects/${id}`);
}

export async function createProject(project: Omit<Project, "id">): Promise<Project> {
  if (isDesktopApp) return desktopRepository.createProject(project);
  return apiRequest<Project>("/projects", { method: "POST", body: project });
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
  if (isDesktopApp) return desktopRepository.updateProject(id, data);
  return apiRequest<Project>(`/projects/${id}`, { method: "PUT", body: data });
}

export async function deleteProject(id: string): Promise<boolean> {
  if (isDesktopApp) return desktopRepository.deleteProject(id);
  await apiRequest(`/projects/${id}`, { method: "DELETE" });
  return true;
}
