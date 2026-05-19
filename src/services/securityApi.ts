import { apiRequest } from "@/services/restClient";

export interface SecurityStatus {
  enabled: boolean;
  level: number;
  maxLevel: number;
  label: string;
  features: Record<string, boolean>;
  retentionDays: number;
  fileScanProvider: string;
  authCookieEnabled: boolean;
  stats: {
    events24h: number;
    highEvents24h: number;
    activeBlocks: number;
    sessionsActive: number;
    quarantinedFiles: number;
  };
}

export interface SecurityEvent {
  id: string;
  requestId?: string | null;
  actorUsername?: string | null;
  sessionId?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  severity: string;
  riskScore: number;
  decision: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SecurityBlock {
  id: string;
  subjectType: string;
  subjectHash: string;
  reason: string;
  severity: string;
  expiresAt: string;
  createdBy?: string | null;
  createdAt: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
}

export interface SecuritySession {
  id: string;
  userId: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  riskScore: number;
  revokedAt?: string | null;
  revokeReason?: string | null;
  createdAt: string;
  lastSeenAt: string;
  user?: {
    username: string;
    email: string;
    role: string;
    level: number;
    track: string;
    accountStatus: string;
  };
}

export interface FileScanRecord {
  id: string;
  objectPath: string;
  sha256: string;
  mime: string;
  size: number;
  verdict: string;
  provider?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type SecurityHistorySection = "events" | "blocks" | "sessions" | "file-scans";

export function getSecurityStatus() {
  return apiRequest<SecurityStatus>("/security/status");
}

export function getSecurityEvents(limit = 50) {
  return apiRequest<SecurityEvent[]>(`/security/events?limit=${limit}`);
}

export function getSecurityBlocks() {
  return apiRequest<SecurityBlock[]>("/security/blocks");
}

export function getSecuritySessions() {
  return apiRequest<SecuritySession[]>("/security/sessions");
}

export function getFileScanRecords() {
  return apiRequest<FileScanRecord[]>("/security/file-scans");
}

export function revokeSecurityBlock(id: string, reason = "Manual unblock") {
  return apiRequest<SecurityBlock>(`/security/blocks/${id}/revoke`, {
    method: "POST",
    body: { reason },
  });
}

export function revokeSecuritySession(id: string, reason = "Manual session revoke") {
  return apiRequest<{ count: number }>(`/security/sessions/${id}/revoke`, {
    method: "POST",
    body: { reason },
  });
}

export function clearSecurityHistory(section: SecurityHistorySection) {
  return apiRequest<{ deleted: number }>(`/security/${section}/history`, {
    method: "DELETE",
  });
}
