import { apiRequest } from "@/services/restClient";

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

export async function listPasswordResetRequests(): Promise<PasswordResetRequestRecord[]> {
  return apiRequest("/auth/password-reset/requests");
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
