import { apiRequest } from "@/services/restClient";

export type StorageCleanupReport = {
  scannedAt: string;
  totalObjects: number;
  totalBytes: number;
  referencedObjects: number;
  referencedBytes: number;
  orphanedObjects: number;
  orphanedBytes: number;
  deletedObjects: number;
  deletedBytes: number;
  folders: Array<{
    folder: string;
    totalObjects: number;
    referencedObjects: number;
    orphanedObjects: number;
    orphanedBytes: number;
  }>;
  sampleOrphans: Array<{
    objectPath: string;
    size?: number;
    lastModified?: string;
  }>;
  automaticCleanup: {
    enabled: true;
    scopes: string[];
  };
};

export async function getStorageCleanupReportRemote() {
  return apiRequest<StorageCleanupReport>("/settings/storage-cleanup");
}

export async function runStorageCleanupRemote() {
  return apiRequest<StorageCleanupReport>("/settings/storage-cleanup", { method: "POST" });
}
