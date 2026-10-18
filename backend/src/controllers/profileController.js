import { db, withTransaction } from "../config/db.js";

async function profileValues(queryable, profileId) {
  const { rows } = await queryable.query(
    "SELECT speles_lauks_id AS fieldId, vertiba AS value FROM anketas_lauka_vertiba WHERE anketa_id = ?",
    [profileId],
  );
  return Object.fromEntries(rows.map(({ fieldId, value }) => [fieldId, value]));
}

async function formatProfile(queryable, row) {
  return {
    id: row.id,
    userId: row.lietotajs_id,
    gameId: row.spele_id,
    about: row.apraksts,
    nick: row.nick,
    updatedAt: row.updated_at,
    values: await profileValues(queryable, row.id),
  };
}

export async function listGameProfiles(req, res) {
  const { rows } = await db.query(
    `SELECT p.id, p.lietotajs_id, p.spele_id, p.apraksts, p.updated_at, u.nick
     FROM anketa p JOIN lietotajs u ON u.id = p.lietotajs_id
     WHERE p.spele_id = ? AND p.ir_dzesta = FALSE AND p.lietotajs_id <> ?
       AND NOT EXISTS (SELECT 1 FROM lietotaja_bans b WHERE b.lietotajs_id = u.id
         AND b.ir_aktivs = 'ir' AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP))
     ORDER BY p.updated_at DESC`,
    [Number(req.params.gameId), req.user.id],
  );
  res.json({ profiles: await Promise.all(rows.map((row) => formatProfile(db, row))) });
}

export async function getMyProfile(req, res) {
  const { rows } = await db.query(
    `SELECT id, lietotajs_id, spele_id, apraksts, updated_at, ? AS nick
     FROM anketa WHERE lietotajs_id = ? AND spele_id = ? AND ir_dzesta = FALSE`,
    [req.user.nick, req.user.id, Number(req.params.gameId)],
  );
  if (!rows[0]) return res.json({ profile: null });
  res.json({ profile: await formatProfile(db, rows[0]) });
}

export async function saveMyProfile(req, res) {
  const { about, values = {} } = req.body;
  const gameId = Number(req.params.gameId);
  if (typeof about !== "string" || !about.trim() || about.length > 600) {
    return res.status(400).json({ error: "Profile description must contain 1 to 600 characters." });
  }
  if (!values || Array.isArray(values) || typeof values !== "object") {
    return res.status(400).json({ error: "Profile values must be an object." });
  }

  const profile = await withTransaction(async (client) => {
    const game = await client.query("SELECT id FROM spele WHERE id = ?", [gameId]);
    if (!game.rows[0]) return null;
    const fieldResult = await client.query(
      "SELECT id, nosaukums, ir_obligats FROM speles_lauks WHERE spele_id = ?",
      [gameId],
    );
    const fields = new Map(fieldResult.rows.map((field) => [String(field.id), field]));
    for (const [fieldId, value] of Object.entries(values)) {
      if (!fields.has(fieldId)) throw Object.assign(new Error("A profile field does not belong to this game."), { status: 400 });
      if (!["string", "number", "boolean"].includes(typeof value)) {
        throw Object.assign(new Error("Profile field values must be text, numbers, or booleans."), { status: 400 });
      }
      if (String(value).length > 200) throw Object.assign(new Error("Profile field values must be at most 200 characters."), { status: 400 });
    }
    for (const field of fieldResult.rows) {
      if (field.ir_obligats && !String(values[field.id] ?? "").trim()) {
        throw Object.assign(new Error(`${field.nosaukums} is required.`), { status: 400 });
      }
    }
    const saved = await client.query(
      `INSERT INTO anketa (apraksts, lietotajs_id, spele_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), apraksts = VALUES(apraksts),
         ir_dzesta = FALSE, updated_at = CURRENT_TIMESTAMP`,
      [about.trim(), req.user.id, gameId],
    );
    const profileId = saved.insertId;
    await client.query("DELETE FROM anketas_lauka_vertiba WHERE anketa_id = ?", [profileId]);
    for (const [fieldId, value] of Object.entries(values)) {
      if (String(value).trim() === "") continue;
      await client.query(
        "INSERT INTO anketas_lauka_vertiba (anketa_id, speles_lauks_id, vertiba) VALUES (?, ?, ?)",
        [profileId, Number(fieldId), String(value)],
      );
    }
    const { rows } = await client.query(
      "SELECT id, lietotajs_id, spele_id, apraksts, updated_at, ? AS nick FROM anketa WHERE id = ?",
      [req.user.nick, profileId],
    );
    const row = rows[0];
    return formatProfile(client, row);
  });
  if (!profile) return res.status(404).json({ error: "Game not found." });
  res.json({ profile });
}

export async function deleteMyProfile(req, res) {
  const result = await db.query(
    "UPDATE anketa SET ir_dzesta = TRUE WHERE lietotajs_id = ? AND spele_id = ? AND ir_dzesta = FALSE",
    [req.user.id, Number(req.params.gameId)],
  );
  if (!result.rowCount) return res.status(404).json({ error: "Profile not found." });
  res.status(204).end();
}

export async function reactToProfile(req, res) {
  const { type } = req.body;
  if (!["like", "dislike"].includes(type)) return res.status(400).json({ error: "Reaction must be 'like' or 'dislike'." });
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      "SELECT id, lietotajs_id FROM anketa WHERE id = ? AND spele_id = ? AND ir_dzesta = FALSE",
      [Number(req.params.profileId), Number(req.params.gameId)],
    );
    const target = rows[0];
    if (!target || String(target.lietotajs_id) === String(req.user.id)) return null;

    const previous = await client.query(
      "SELECT tips FROM reakcija WHERE lietotajs_id = ? AND anketa_id = ?",
      [req.user.id, target.id],
    );
    await client.query(
      `INSERT INTO reakcija (tips, lietotajs_id, anketa_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE tips = VALUES(tips), datums = CURRENT_TIMESTAMP`,
      [type === "like" ? "patik" : "nepatik", req.user.id, target.id],
    );

    let match = false;
    if (type === "like") {
      const reciprocal = await client.query(
        `SELECT p.id FROM anketa p
         JOIN reakcija r ON r.anketa_id = p.id AND r.lietotajs_id = ? AND r.tips = 'patik'
         WHERE p.lietotajs_id = ? AND p.spele_id = ? AND p.ir_dzesta = FALSE`,
        [target.lietotajs_id, req.user.id, Number(req.params.gameId)],
      );
      match = reciprocal.rows.length > 0;

      if (previous.rows[0]?.tips !== "patik") {
        const notificationType = match ? "match" : "like";
        await client.query(
          `INSERT INTO notification (recipient_id, actor_id, game_id, profile_id, notification_type)
           VALUES (?, ?, ?, ?, ?)`,
          [target.lietotajs_id, req.user.id, Number(req.params.gameId), target.id, notificationType],
        );
        if (match) {
          const ownProfile = await client.query(
            "SELECT id FROM anketa WHERE lietotajs_id = ? AND spele_id = ? AND ir_dzesta = FALSE",
            [req.user.id, Number(req.params.gameId)],
          );
          await client.query(
            `INSERT INTO notification (recipient_id, actor_id, game_id, profile_id, notification_type)
             VALUES (?, ?, ?, ?, 'match')`,
            [req.user.id, target.lietotajs_id, Number(req.params.gameId), ownProfile.rows[0].id],
          );
        }
      }
    }
    return { match };
  });
  if (!result) return res.status(404).json({ error: "Profile not found." });
  const { match } = result;
  res.json({ match });
}

export async function reportProfile(req, res) {
  const reason = req.body.reason;
  if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) {
    return res.status(400).json({ error: "Report reason must contain 1 to 1000 characters." });
  }
  const { rows } = await db.query(
    "SELECT id FROM anketa WHERE id = ? AND spele_id = ? AND ir_dzesta = FALSE AND lietotajs_id <> ?",
    [Number(req.params.profileId), Number(req.params.gameId), req.user.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Profile not found." });
  await db.query(
    `INSERT INTO zinojums (pamatojums, anketa_id, lietotajs_id) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE pamatojums = VALUES(pamatojums), datums = CURRENT_TIMESTAMP, admin_id = NULL`,
    [reason.trim(), rows[0].id, req.user.id],
  );
  res.status(201).json({ message: "Report submitted." });
}