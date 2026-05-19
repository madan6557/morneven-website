import { apiRequest, buildQuery, toPageResponse, type BackendPage } from "@/services/restClient";
import type { PageInfo } from "@/services/pagination";

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export interface PasswordResetRequestRecord {
  id: string;
  email: string;
  username: string;
  identityProof: string;
  status: "pending" | "approved" | "rejected" | "completed" | string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  completedAt?: string;
  targetUser?: {
    id: string;
    username: string;
    email: string;
    role: string;
    level: number;
    track: string;
    status?: string;
  };
  reviewedBy?: {
    id: string;
    username: string;
    email: string;
    role: string;
    level: number;
    track: string;
    status?: string;
  };
}

export interface PasswordResetRequestSummary {
  total: number;
  pending: number;
  completed: number;
  clearable: number;
}

export interface PasswordResetRequestPage {
  items: PasswordResetRequestRecord[];
  pageInfo: PageInfo;
  summary: PasswordResetRequestSummary;
}

export async function submitPasswordResetRequest(input: {
  email: string;
  username: string;
  newPassword: string;
  confirmPassword: string;
  identityProof: string;
}): Promise<PasswordResetRequestRecord> {
  return apiRequest("/auth/password-reset/request", {
    method: "POST",
    auth: false,
    body: input,
  });
}

export async function confirmApprovedPasswordReset(input: {
  email: string;
  username: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  await apiRequest("/auth/password-reset/confirm", {
    method: "POST",
    auth: false,
    body: input,
  });
}

export async function listPasswordResetRequests(params: { page?: number; pageSize?: number } = {}): Promise<PasswordResetRequestPage> {
  const data = await apiRequest<
    | PasswordResetRequestRecord[]
    | (BackendPage<PasswordResetRequestRecord> & { summary?: Partial<PasswordResetRequestSummary> })
  >(`/auth/password-reset/requests${buildQuery(params)}`);
  const page = toPageResponse(data, params);
  const fallbackSummary = page.items.reduce<PasswordResetRequestSummary>(
    (summary, item) => {
      summary.total += 1;
      if (item.status === "pending") summary.pending += 1;
      if (item.status === "completed") summary.completed += 1;
      if (item.status === "rejected" || item.status === "completed") summary.clearable += 1;
      return summary;
    },
    { total: 0, pending: 0, completed: 0, clearable: 0 },
  );
  const summary = Array.isArray(data) ? fallbackSummary : data.summary;

  return {
    ...page,
    summary: {
      total: summary?.total ?? page.pageInfo.total,
      pending: summary?.pending ?? fallbackSummary.pending,
      completed: summary?.completed ?? fallbackSummary.completed,
      clearable: summary?.clearable ?? fallbackSummary.clearable,
    },
  };
}

export async function reviewPasswordResetRequest(
  id: string,
  input: { status: "approved" | "rejected"; reviewNote?: string },
): Promise<PasswordResetRequestRecord> {
  return apiRequest(`/auth/password-reset/requests/${id}/review`, {
    method: "POST",
    body: input,
  });
}

export async function clearPasswordResetHistory(): Promise<{ deleted: number }> {
  return apiRequest("/auth/password-reset/requests/history", {
    method: "DELETE",
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export async function deleteAccount(password: string): Promise<void> {
  await apiRequest("/auth/delete-account", {
    method: "DELETE",
    body: { password },
  });
}
