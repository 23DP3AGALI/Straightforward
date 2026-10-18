import { db, withTransaction } from "../config/db.js";

async function findMatch(queryable, gameId, userId, otherUserId) {
  const { rows } = await queryable.query(
    `SELECT mine.id AS my_profile_id, theirs.id AS their_profile_id
     FROM anketa mine
     JOIN anketa theirs ON theirs.spele_id = mine.spele_id
       AND theirs.lietotajs_id = ? AND theirs.ir_dzesta = FALSE
     JOIN reakcija my_like ON my_like.anketa_id = theirs.id
       AND my_like.lietotajs_id = mine.lietotajs_id AND my_like.tips = 'patik'
     JOIN reakcija their_like ON their_like.anketa_id = mine.id
       AND their_like.lietotajs_id = theirs.lietotajs_id AND their_like.tips = 'patik'
     WHERE mine.lietotajs_id = ? AND mine.spele_id = ?
       AND mine.ir_dzesta = FALSE
     LIMIT 1`,
    [otherUserId, userId, gameId],
  );
  return rows[0] || null;
}

export async function listChats(req, res) {
  const { rows } = await db.query(
    `SELECT g.id AS gameId, g.nosaukums AS gameName,
            other.id AS userId, other.nick, other.kontakt_informacija AS contact,
            (SELECT m.message_text FROM chat_message m
             WHERE m.game_id = g.id
               AND ((m.sender_id = req_user.id AND m.recipient_id = other.id)
                 OR (m.sender_id = other.id AND m.recipient_id = req_user.id))
             ORDER BY m.id DESC LIMIT 1) AS lastMessage,
            (SELECT m.created_at FROM chat_message m
             WHERE m.game_id = g.id
               AND ((m.sender_id = req_user.id AND m.recipient_id = other.id)
                 OR (m.sender_id = other.id AND m.recipient_id = req_user.id))
             ORDER BY m.id DESC LIMIT 1) AS lastMessageAt,
            (SELECT COUNT(*) FROM chat_message m
             WHERE m.game_id = g.id AND m.sender_id = other.id
               AND m.recipient_id = req_user.id
               AND NOT EXISTS (
                 SELECT 1 FROM notification n
                 WHERE n.message_id = m.id AND n.recipient_id = req_user.id AND n.is_read = TRUE
               )) AS unread
     FROM lietotajs req_user
     JOIN anketa mine ON mine.lietotajs_id = req_user.id AND mine.ir_dzesta = FALSE
     JOIN anketa theirs ON theirs.spele_id = mine.spele_id AND theirs.ir_dzesta = FALSE
     JOIN reakcija my_like ON my_like.anketa_id = theirs.id
       AND my_like.lietotajs_id = req_user.id AND my_like.tips = 'patik'
     JOIN reakcija their_like ON their_like.anketa_id = mine.id
       AND their_like.lietotajs_id = theirs.lietotajs_id AND their_like.tips = 'patik'
     JOIN lietotajs other ON other.id = theirs.lietotajs_id
     JOIN spele g ON g.id = mine.spele_id
     WHERE req_user.id = ?
     ORDER BY lastMessageAt DESC, g.id DESC`,
    [req.user.id],
  );
  res.json({
    chats: rows.map((chat) => ({
      ...chat,
      last: chat.lastMessage == null
        ? null
        : { text: chat.lastMessage, createdAt: chat.lastMessageAt },
      unread: Number(chat.unread),
    })),
  });
}

export async function getMessages(req, res) {
  const gameId = Number(req.params.gameId);
  const otherUserId = Number(req.params.userId);
  const match = await findMatch(db, gameId, req.user.id, otherUserId);
  if (!match) return res.status(403).json({ error: "Messages are available after a mutual like." });

  const { rows } = await db.query(
    `SELECT id, sender_id AS fromUserId, message_text AS text, created_at AS createdAt
     FROM (
       SELECT id, sender_id, message_text, created_at
       FROM chat_message
       WHERE game_id = ? AND (
         (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
       )
       ORDER BY id DESC
       LIMIT 200
     ) recent_messages
     ORDER BY id ASC`,
    [gameId, req.user.id, otherUserId, otherUserId, req.user.id],
  );
  await db.query(
    `UPDATE notification SET is_read = TRUE
     WHERE recipient_id = ? AND actor_id = ? AND game_id = ?
       AND notification_type = 'message' AND is_read = FALSE`,
    [req.user.id, otherUserId, gameId],
  );
  res.json({ messages: rows });
}

export async function sendMessage(req, res) {
  const gameId = Number(req.params.gameId);
  const otherUserId = Number(req.params.userId);
  const text = req.body?.text;
  if (typeof text !== "string" || !text.trim() || text.trim().length > 500) {
    return res.status(400).json({ error: "Message must contain 1 to 500 characters." });
  }
  if (!Number.isInteger(otherUserId) || otherUserId <= 0 || otherUserId === Number(req.user.id)) {
    return res.status(400).json({ error: "Invalid chat recipient." });
  }

  const message = await withTransaction(async (client) => {
    const match = await findMatch(client, gameId, req.user.id, otherUserId);
    if (!match) return null;

    const inserted = await client.query(
      `INSERT INTO chat_message (game_id, sender_id, recipient_id, message_text)
       VALUES (?, ?, ?, ?)`,
      [gameId, req.user.id, otherUserId, text.trim()],
    );
    const { rows } = await client.query(
      `SELECT id, sender_id AS fromUserId, message_text AS text, created_at AS createdAt
       FROM chat_message WHERE id = ?`,
      [inserted.insertId],
    );
    await client.query(
      `INSERT INTO notification (recipient_id, actor_id, game_id, message_id, notification_type)
       VALUES (?, ?, ?, ?, 'message')`,
      [otherUserId, req.user.id, gameId, inserted.insertId],
    );
    return rows[0];
  });
  if (!message) return res.status(403).json({ error: "Messages are available after a mutual like." });
  res.status(201).json({ message });
}
