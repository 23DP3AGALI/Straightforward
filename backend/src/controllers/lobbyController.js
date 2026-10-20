import { db, withTransaction } from "../config/db.js";

async function attachMemberPreviews(lobbies) {
  if (!lobbies.length) return lobbies;
  const ids = lobbies.map((lobby) => lobby.id);
  const placeholders = ids.map(() => "?").join(", ");
  const { rows } = await db.query(
    `SELECT m.lobby_id AS lobbyId, u.id, u.nick, u.avatar
     FROM team_lobby_member m
     JOIN lietotajs u ON u.id = m.user_id
     WHERE m.lobby_id IN (${placeholders})
     ORDER BY m.joined_at, u.id`,
    ids,
  );
  const membersByLobby = new Map();
  for (const member of rows) {
    const key = String(member.lobbyId);
    const members = membersByLobby.get(key) || [];
    if (members.length < 5) members.push({ id: member.id, nick: member.nick, avatar: member.avatar || "" });
    membersByLobby.set(key, members);
  }
  return lobbies.map((lobby) => ({ ...lobby, members: membersByLobby.get(String(lobby.id)) || [] }));
}

export async function listMyLobbies(req, res) {
  const { rows } = await db.query(
    `SELECT l.id, l.game_id AS gameId, g.nosaukums AS gameName, l.owner_id AS ownerId,
            u.nick AS ownerNick, l.title, l.description, l.starts_at AS startsAt,
            l.max_players AS maxPlayers, g.attels AS gameImage,
            (SELECT COUNT(*) FROM team_lobby_member all_members WHERE all_members.lobby_id = l.id) AS playerCount,
            (SELECT message_text FROM team_lobby_message m WHERE m.lobby_id = l.id ORDER BY m.id DESC LIMIT 1) AS lastMessage,
            (SELECT created_at FROM team_lobby_message m WHERE m.lobby_id = l.id ORDER BY m.id DESC LIMIT 1) AS lastMessageAt
     FROM team_lobby_member membership
     JOIN team_lobby l ON l.id = membership.lobby_id AND l.status = 'open'
     JOIN spele g ON g.id = l.game_id
     JOIN lietotajs u ON u.id = l.owner_id
     WHERE membership.user_id = ?
     ORDER BY (l.starts_at IS NULL), l.starts_at, l.created_at DESC`,
    [req.user.id],
  );
  const lobbies = rows.map((row) => ({
    ...row,
    playerCount: Number(row.playerCount),
    maxPlayers: Number(row.maxPlayers),
  }));
  res.json({ lobbies: await attachMemberPreviews(lobbies) });
}

export async function listLobbies(req, res) {
  const { rows } = await db.query(
    `SELECT l.id, l.game_id AS gameId, l.owner_id AS ownerId, u.nick AS ownerNick,
            l.title, l.description, l.player_rank AS \`rank\`, l.languages, l.platform,
            l.starts_at AS startsAt, l.max_players AS maxPlayers, l.created_at AS createdAt,
            (SELECT COUNT(*) FROM team_lobby_member m WHERE m.lobby_id = l.id) AS playerCount,
            EXISTS (SELECT 1 FROM team_lobby_member m WHERE m.lobby_id = l.id AND m.user_id = ?) AS joined
     FROM team_lobby l
     JOIN lietotajs u ON u.id = l.owner_id
     WHERE l.game_id = ? AND l.status = 'open'
     ORDER BY (l.starts_at IS NULL), l.starts_at, l.created_at DESC
     LIMIT 50`,
    [req.user.id, Number(req.params.gameId)],
  );
  const lobbies = rows.map((row) => ({
    ...row,
    joined: Boolean(row.joined),
    playerCount: Number(row.playerCount),
    maxPlayers: Number(row.maxPlayers),
  }));
  res.json({ lobbies: await attachMemberPreviews(lobbies) });
}

export async function createLobby(req, res) {
  const {
    title, description = "", rank = "", languages = "", platform = "",
    startsAt = null, maxPlayers = 5,
  } = req.body;
  if (typeof title !== "string" || !title.trim() || title.trim().length > 100) {
    return res.status(400).json({ error: "Lobby title must contain 1 to 100 characters." });
  }
  if (typeof description !== "string" || description.length > 300) {
    return res.status(400).json({ error: "Lobby description must be at most 300 characters." });
  }
  for (const [key, value, limit] of [
    ["rank", rank, 80], ["languages", languages, 200], ["platform", platform, 100],
  ]) {
    if (typeof value !== "string" || value.length > limit) {
      return res.status(400).json({ error: `Lobby ${key} must be text of at most ${limit} characters.` });
    }
  }
  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 20) {
    return res.status(400).json({ error: "Lobby size must be between 2 and 20 players." });
  }
  let startsAtValue = null;
  if (startsAt != null && startsAt !== "") {
    if (typeof startsAt !== "string" || Number.isNaN(Date.parse(startsAt)) || Date.parse(startsAt) <= Date.now()) {
      return res.status(400).json({ error: "Lobby start time must be a valid future date." });
    }
    startsAtValue = new Date(startsAt).toISOString().slice(0, 19).replace("T", " ");
  }

  const gameId = Number(req.params.gameId);
  const lobby = await withTransaction(async (client) => {
    const game = await client.query("SELECT id FROM spele WHERE id = ?", [gameId]);
    if (!game.rows[0]) return null;
    const inserted = await client.query(
      `INSERT INTO team_lobby
         (game_id, owner_id, title, description, player_rank, languages, platform, starts_at, max_players)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gameId, req.user.id, title.trim(), description.trim(),
        rank.trim() || null, languages.trim() || null, platform.trim() || null,
        startsAtValue, maxPlayers,
      ],
    );
    await client.query(
      "INSERT INTO team_lobby_member (lobby_id, user_id) VALUES (?, ?)",
      [inserted.insertId, req.user.id],
    );
    return inserted.insertId;
  });
  if (!lobby) return res.status(404).json({ error: "Game not found." });
  res.status(201).json({ lobbyId: lobby });
}

export async function joinLobby(req, res) {
  const lobbyId = Number(req.params.lobbyId);
  const result = await withTransaction(async (client) => {
    const lobby = await client.query(
      "SELECT id, max_players FROM team_lobby WHERE id = ? AND game_id = ? AND status = 'open' FOR UPDATE",
      [lobbyId, Number(req.params.gameId)],
    );
    if (!lobby.rows[0]) return "missing";
    const existing = await client.query(
      "SELECT user_id FROM team_lobby_member WHERE lobby_id = ? AND user_id = ?",
      [lobbyId, req.user.id],
    );
    if (existing.rows[0]) return "joined";
    const count = await client.query(
      "SELECT COUNT(*) AS count FROM team_lobby_member WHERE lobby_id = ?",
      [lobbyId],
    );
    if (Number(count.rows[0].count) >= Number(lobby.rows[0].max_players)) return "full";
    await client.query(
      "INSERT INTO team_lobby_member (lobby_id, user_id) VALUES (?, ?)",
      [lobbyId, req.user.id],
    );
    return "joined";
  });
  if (result === "missing") return res.status(404).json({ error: "Open lobby not found." });
  if (result === "full") return res.status(409).json({ error: "This lobby is full." });
  res.json({ joined: true });
}

export async function leaveLobby(req, res) {
  const lobbyId = Number(req.params.lobbyId);
  const { rows } = await db.query(
    "SELECT owner_id AS ownerId FROM team_lobby WHERE id = ? AND game_id = ? AND status = 'open'",
    [lobbyId, Number(req.params.gameId)],
  );
  if (!rows[0]) return res.status(404).json({ error: "Open lobby not found." });
  if (String(rows[0].ownerId) === String(req.user.id)) {
    return res.status(400).json({ error: "The lobby owner must close the lobby instead of leaving it." });
  }
  const result = await db.query(
    "DELETE FROM team_lobby_member WHERE lobby_id = ? AND user_id = ?",
    [lobbyId, req.user.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: "You are not a member of this lobby." });
  res.status(204).end();
}

export async function closeLobby(req, res) {
  const result = await db.query(
    "UPDATE team_lobby SET status = 'closed' WHERE id = ? AND game_id = ? AND owner_id = ? AND status = 'open'",
    [Number(req.params.lobbyId), Number(req.params.gameId), req.user.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: "Open lobby not found." });
  res.status(204).end();
}
