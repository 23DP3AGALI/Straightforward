import { db, withTransaction } from "../config/db.js";

async function findJoinedLobby(queryable, lobbyId, userId) {
  const { rows } = await queryable.query(
    `SELECT l.id, l.game_id AS gameId, l.title, g.nosaukums AS gameName
     FROM team_lobby l
     JOIN spele g ON g.id = l.game_id
     JOIN team_lobby_member m ON m.lobby_id = l.id AND m.user_id = ?
     WHERE l.id = ? AND l.status = 'open'`,
    [userId, lobbyId],
  );
  return rows[0] || null;
}

export async function getLobbyMessages(req, res) {
  const lobbyId = Number(req.params.lobbyId);
  if (!Number.isSafeInteger(lobbyId) || lobbyId <= 0) {
    return res.status(400).json({ error: "Invalid lobby id." });
  }

  const lobby = await findJoinedLobby(db, lobbyId, req.user.id);
  if (!lobby) return res.status(403).json({ error: "Join an open lobby to access its group chat." });

  const { rows } = await db.query(
    `SELECT m.id, m.sender_id AS fromUserId, u.nick AS senderNick,
            m.message_text AS text, m.created_at AS createdAt
     FROM (
       SELECT id, sender_id, message_text, created_at
       FROM team_lobby_message
       WHERE lobby_id = ?
       ORDER BY id DESC
       LIMIT 200
     ) m
     JOIN lietotajs u ON u.id = m.sender_id
     ORDER BY m.id ASC`,
    [lobbyId],
  );
  res.json({ lobby, messages: rows });
}

export async function sendLobbyMessage(req, res) {
  const lobbyId = Number(req.params.lobbyId);
  const text = req.body?.text;
  if (!Number.isSafeInteger(lobbyId) || lobbyId <= 0) {
    return res.status(400).json({ error: "Invalid lobby id." });
  }
  if (typeof text !== "string" || !text.trim() || text.trim().length > 500) {
    return res.status(400).json({ error: "Message must contain 1 to 500 characters." });
  }

  const message = await withTransaction(async (client) => {
    const lobby = await findJoinedLobby(client, lobbyId, req.user.id);
    if (!lobby) return null;
    const inserted = await client.query(
      "INSERT INTO team_lobby_message (lobby_id, sender_id, message_text) VALUES (?, ?, ?)",
      [lobbyId, req.user.id, text.trim()],
    );
    const { rows } = await client.query(
      `SELECT m.id, m.sender_id AS fromUserId, u.nick AS senderNick,
              m.message_text AS text, m.created_at AS createdAt
       FROM team_lobby_message m
       JOIN lietotajs u ON u.id = m.sender_id
       WHERE m.id = ?`,
      [inserted.insertId],
    );
    return rows[0];
  });

  if (!message) return res.status(403).json({ error: "Join an open lobby to access its group chat." });
  res.status(201).json({ message });
}
