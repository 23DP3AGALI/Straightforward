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

export async function likeBack(notification) {
  if (!notification.actorProfileId) throw new Error("This user no longer has an active profile.");
  return apiRequest(
    `/games/${encodeURIComponent(notification.gameId)}/profiles/${encodeURIComponent(notification.actorProfileId)}/reactions`,
    { method: "POST", auth: true, body: { type: "like" } },
  );
}
