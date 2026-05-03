import { apiRequest } from "@/services/restClient";

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email },
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
