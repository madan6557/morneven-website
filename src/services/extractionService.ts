import { apiRequest, getAccessToken, getApiBaseUrl, unwrapPageItems, type BackendPage } from "@/services/restClient";

export type ExtractionMode = "db" | "images" | "all";
export type ExtractionStatus = "processing" | "completed" | "failed";
export type BackupMediaSource =
  | "chat"
  | "gallery"
  | "characters"
  | "creatures"
  | "places"
  | "technology"
  | "events"
  | "other"
  | "projects"
  | "news"
  | "map";

export interface ExtractionJob {
  id: string;
  mode: ExtractionMode;
  autoDownload: boolean;
  status: ExtractionStatus;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  downloadName?: string;
  blobUrl?: string;
  error?: string;
  progress?: {
    percent: number;
    stage: string;
    message: string;
  };
}

export function listExtractionHistory(): ExtractionJob[] {
  return [];
}

export async function listExtractionHistoryRemote(): Promise<ExtractionJob[]> {
  return unwrapPageItems(
    await apiRequest<ExtractionJob[] | BackendPage<ExtractionJob>>("/settings/extractions"),
  );
}

export async function clearExtractionHistory(ids?: string[]): Promise<void> {
  await apiRequest("/settings/extractions", {
    method: "DELETE",
    body: { ids },
  });
}

export function startExtraction(_mode: ExtractionMode, _autoDownload: boolean): ExtractionJob {
  throw new Error("Local extraction fallback has been removed. Use the backend extraction job endpoint.");
}

export async function startExtractionRemote(
  mode: ExtractionMode,
  autoDownload: boolean,
  payload: { confirmText?: string; password?: string; mediaSources?: BackupMediaSource[] } = {},
): Promise<ExtractionJob> {
  return apiRequest<ExtractionJob>("/settings/extractions", {
    method: "POST",
    body: { mode, autoDownload, ...payload },
  });
}

export function pollExtractionJob(id: string): Promise<ExtractionJob> {
  return apiRequest<ExtractionJob>(`/settings/extractions/${id}`);
}

export function getExtractionDownloadUrl(id: string): string {
  return `${getApiBaseUrl()}/settings/extractions/${id}/download`;
}

export async function downloadExtractionJob(job: ExtractionJob): Promise<void> {
  if (job.blobUrl) {
    const anchor = document.createElement("a");
    anchor.href = job.blobUrl;
    anchor.download = job.downloadName ?? `morneven-backup-${job.id}.zip`;
    anchor.click();
    return;
  }

  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(getExtractionDownloadUrl(job.id), { headers });
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = job.downloadName ?? `morneven-backup-${job.id}.zip`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function canUseLocalExtractionFallback(): boolean {
  return false;
}
