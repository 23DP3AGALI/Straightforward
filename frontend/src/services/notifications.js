import { apiRequest } from "./api";

export async function getNotifications() {
  const { notifications } = await apiRequest("/notifications", { auth: true });
  return notifications;
}

export async function getUnreadNotificationCount() {
  const { count } = await apiRequest("/notifications/unread-count", { auth: true });
  return count;
}

export async function markAllNotificationsRead() {
  await apiRequest("/notifications/read", { method: "POST", auth: true });
}

export async function markNotificationRead(notificationId) {
  await apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    auth: true,
  });
}
