import { ApiError, apiRequest, apiUploadForm, getAccessToken, getApiBaseUrl, type UploadProgress } from "@/services/restClient";

const BACKUP_MIGRATION_TIMEOUT_MS = 30 * 60 * 1000;

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
    skippedAssets?: Array<{ objectPath: string; reason: string }>;
  };
}

export interface ScannerBlockedFile {
  objectPath: string;
  reason: string;
}

export function getScannerBlockedFiles(error: unknown): ScannerBlockedFile[] | null {
  if (!(error instanceof ApiError) || error.errorCode !== "BACKUP_SCANNER_APPROVAL_REQUIRED") return null;
  const files = error.errors
    .filter((item) => Boolean(item.path))
    .map((item) => ({ objectPath: item.path!, reason: item.message }));
  return files.length > 0 ? files : null;
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
  password: string;
  secretKey: string;
  confirmText: "MIGRATION";
  allowBlockedFiles?: string[];
  onUploadProgress?: (progress: UploadProgress) => void;
}): Promise<MigrationJob> {
  const form = new FormData();
  form.append("backup", payload.backupFile);
  form.append("password", payload.password);
  form.append("secretKey", payload.secretKey);
  form.append("confirmText", payload.confirmText);
  if (payload.allowBlockedFiles) form.append("allowBlockedFiles", JSON.stringify(payload.allowBlockedFiles));
  return apiUploadForm<MigrationJob>("/settings/migrations/from-backup", form, {
    timeoutMs: BACKUP_MIGRATION_TIMEOUT_MS,
    onProgress: payload.onUploadProgress,
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
