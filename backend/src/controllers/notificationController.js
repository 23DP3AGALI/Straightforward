import { db } from "../config/db.js";

export async function listNotifications(req, res) {
  const { rows } = await db.query(
    `SELECT n.id, n.notification_type AS type, n.game_id AS gameId,
            n.profile_id AS profileId, n.message_id AS messageId,
            n.is_read AS isRead, n.created_at AS createdAt,
            actor.id AS actorId, actor.nick AS actorNick,
            g.nosaukums AS gameName,
            actor_profile.id AS actorProfileId,
            message.message_text AS messageText
     FROM notification n
     JOIN lietotajs actor ON actor.id = n.actor_id
     JOIN spele g ON g.id = n.game_id
     LEFT JOIN anketa actor_profile
       ON actor_profile.lietotajs_id = n.actor_id
       AND actor_profile.spele_id = n.game_id
       AND actor_profile.ir_dzesta = FALSE
     LEFT JOIN chat_message message ON message.id = n.message_id
     WHERE n.recipient_id = ?
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT 100`,
    [req.user.id],
  );
  res.json({ notifications: rows });
}

export async function getUnreadCount(req, res) {
  const { rows } = await db.query(
    "SELECT COUNT(*) AS count FROM notification WHERE recipient_id = ? AND is_read = FALSE",
    [req.user.id],
  );
  res.json({ count: Number(rows[0].count) });
}

export async function markAllNotificationsRead(req, res) {
  await db.query(
    "UPDATE notification SET is_read = TRUE WHERE recipient_id = ? AND is_read = FALSE",
    [req.user.id],
  );
  res.status(204).end();
}

export async function markNotificationRead(req, res) {
  const notificationId = Number(req.params.notificationId);
  const { rows } = await db.query(
    "SELECT id FROM notification WHERE id = ? AND recipient_id = ?",
    [notificationId, req.user.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Notification not found." });
  await db.query(
    "UPDATE notification SET is_read = TRUE WHERE id = ? AND recipient_id = ?",
    [notificationId, req.user.id],
  );
  res.status(204).end();
}
