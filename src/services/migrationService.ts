import { apiRequest, getAccessToken, getApiBaseUrl } from "@/services/restClient";

export interface MigrationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  targetUrl: string;
  createdAt: string;
  completedAt?: string;
  downloadName?: string;
  error?: string;
  progress?: {
    percent: number;
    stage: string;
    message: string;
  };
  summary?: {
    tables: Record<string, number>;
    assetCount: number;
  };
  verification?: {
    tables: Record<string, number>;
    assetCount: number;
    uploadedAssetCount: number;
    failedAssets: Array<{ objectPath: string; error: string }>;
  };
}

export async function listMigrationHistoryRemote(): Promise<MigrationJob[]> {
  return apiRequest<MigrationJob[]>("/settings/migrations");
}

export async function startMigrationRemote(payload: {
  newBaseUrl?: string;
  migrationUrl?: string;
  password: string;
  secretKey: string;
  confirmText: "MIGRATION";
}): Promise<MigrationJob> {
  return apiRequest<MigrationJob>("/settings/migrations", {
    method: "POST",
    body: payload,
  });
}

export async function startMigrationFromBackupRemote(payload: {
  backupFile: File;
  newBaseUrl?: string;
  migrationUrl?: string;
  password: string;
  secretKey: string;
  confirmText: "MIGRATION";
}): Promise<MigrationJob> {
  const form = new FormData();
  form.append("backup", payload.backupFile);
  if (payload.newBaseUrl) form.append("newBaseUrl", payload.newBaseUrl);
  if (payload.migrationUrl) form.append("migrationUrl", payload.migrationUrl);
  form.append("password", payload.password);
  form.append("secretKey", payload.secretKey);
  form.append("confirmText", payload.confirmText);
  return apiRequest<MigrationJob>("/settings/migrations/from-backup", {
    method: "POST",
    body: form,
    timeoutMs: 300000,
  });
}

export async function getMigrationJobRemote(id: string): Promise<MigrationJob> {
  return apiRequest<MigrationJob>(`/settings/migrations/${id}`);
}

export function getMigrationDownloadUrl(id: string): string {
  return `${getApiBaseUrl()}/settings/migrations/${id}/download`;
}

export async function downloadMigrationReport(job: MigrationJob): Promise<void> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(getMigrationDownloadUrl(job.id), { headers });
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = job.downloadName ?? `morneven-migration-report-${job.id}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
