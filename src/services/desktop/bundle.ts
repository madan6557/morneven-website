import { decryptJson, deriveWorkspaceKey, encryptJson, randomBase64, type EncryptedValue } from "./crypto";
import { exportWorkspaceData, importWorkspaceData } from "./workspaceDb";

interface WorkspaceBundleEnvelope {
  format: "morneven-workspace";
  version: 1;
  salt: string;
  encrypted: EncryptedValue;
}

export async function exportWorkspaceBundle(password: string): Promise<Blob> {
  const snapshot = await exportWorkspaceData();
  const salt = randomBase64(16);
  const key = await deriveWorkspaceKey(password, salt);
  const envelope: WorkspaceBundleEnvelope = {
    format: "morneven-workspace",
    version: 1,
    salt,
    encrypted: await encryptJson(snapshot, key),
  };
  return new Blob([JSON.stringify(envelope)], { type: "application/octet-stream" });
}

export async function importWorkspaceBundle(file: File, password: string) {
  const envelope = JSON.parse(await file.text()) as Partial<WorkspaceBundleEnvelope>;
  if (envelope.format !== "morneven-workspace" || envelope.version !== 1 || !envelope.salt || !envelope.encrypted) {
    throw new Error("Unsupported Morneven workspace bundle.");
  }
  const key = await deriveWorkspaceKey(password, envelope.salt);
  const snapshot = await decryptJson<Awaited<ReturnType<typeof exportWorkspaceData>>>(envelope.encrypted, key);
  if (
    !snapshot?.meta ||
    snapshot.meta.schemaVersion !== 1 ||
    !Array.isArray(snapshot.records) ||
    !Array.isArray(snapshot.operations) ||
    !Array.isArray(snapshot.conflicts) ||
    !Array.isArray(snapshot.media)
  ) {
    throw new Error("Workspace bundle is incomplete.");
  }
  await importWorkspaceData(snapshot);
}
