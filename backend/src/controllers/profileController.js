import { pool, withTransaction } from "../config/db.js";

async function profileValues(queryable, profileId) {
  const { rows } = await queryable.query(
    "SELECT speles_lauks_id AS \"fieldId\", vertiba AS value FROM anketas_lauka_vertiba WHERE anketa_id = $1",
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
  const { rows } = await pool.query(
    `SELECT p.id, p.lietotajs_id, p.spele_id, p.apraksts, p.updated_at, u.nick
     FROM anketa p JOIN lietotajs u ON u.id = p.lietotajs_id
     WHERE p.spele_id = $1 AND p.ir_dzesta = FALSE AND p.lietotajs_id <> $2
       AND NOT EXISTS (SELECT 1 FROM lietotaja_bans b WHERE b.lietotajs_id = u.id
         AND b.ir_aktivs = 'ir' AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP))
     ORDER BY p.updated_at DESC`,
    [Number(req.params.gameId), req.user.id],
  );
  res.json({ profiles: await Promise.all(rows.map((row) => formatProfile(pool, row))) });
}

export async function getMyProfile(req, res) {
  const { rows } = await pool.query(
    `SELECT id, lietotajs_id, spele_id, apraksts, updated_at, $3::varchar AS nick
     FROM anketa WHERE lietotajs_id = $1 AND spele_id = $2 AND ir_dzesta = FALSE`,
    [req.user.id, Number(req.params.gameId), req.user.nick],
  );
  if (!rows[0]) return res.json({ profile: null });
  res.json({ profile: await formatProfile(pool, rows[0]) });
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
    const game = await client.query("SELECT id FROM spele WHERE id = $1", [gameId]);
    if (!game.rows[0]) return null;
    const fieldResult = await client.query(
      "SELECT id, nosaukums, ir_obligats FROM speles_lauks WHERE spele_id = $1",
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
      `INSERT INTO anketa (apraksts, lietotajs_id, spele_id) VALUES ($1, $2, $3)
       ON CONFLICT (lietotajs_id, spele_id)
      DO UPDATE SET apraksts = EXCLUDED.apraksts, ir_dzesta = FALSE, updated_at = CURRENT_TIMESTAMP
      RETURNING id, lietotajs_id, spele_id, apraksts, updated_at`,
      [about.trim(), req.user.id, gameId],
    );
    const row = { ...saved.rows[0], nick: req.user.nick };
    await client.query("DELETE FROM anketas_lauka_vertiba WHERE anketa_id = $1", [row.id]);
    for (const [fieldId, value] of Object.entries(values)) {
      if (String(value).trim() === "") continue;
      await client.query(
        "INSERT INTO anketas_lauka_vertiba (anketa_id, speles_lauks_id, vertiba) VALUES ($1, $2, $3)",
        [row.id, Number(fieldId), String(value)],
      );
    }
    return formatProfile(client, row);
  });
  if (!profile) return res.status(404).json({ error: "Game not found." });
  res.json({ profile });
}

export async function deleteMyProfile(req, res) {
  const result = await pool.query(
    "UPDATE anketa SET ir_dzesta = TRUE WHERE lietotajs_id = $1 AND spele_id = $2 AND ir_dzesta = FALSE",
    [req.user.id, Number(req.params.gameId)],
  );
  if (!result.rowCount) return res.status(404).json({ error: "Profile not found." });
  res.status(204).end();
}

export async function reactToProfile(req, res) {
  const { type } = req.body;
  if (!["like", "dislike"].includes(type)) return res.status(400).json({ error: "Reaction must be 'like' or 'dislike'." });
  const { rows } = await pool.query(
    "SELECT id, lietotajs_id FROM anketa WHERE id = $1 AND spele_id = $2 AND ir_dzesta = FALSE",
    [Number(req.params.profileId), Number(req.params.gameId)],
  );
  const target = rows[0];
  if (!target || target.lietotajs_id === req.user.id) return res.status(404).json({ error: "Profile not found." });
  await pool.query(
    `INSERT INTO reakcija (tips, lietotajs_id, anketa_id) VALUES ($1, $2, $3)
     ON CONFLICT (lietotajs_id, anketa_id)
     DO UPDATE SET tips = EXCLUDED.tips, datums = CURRENT_TIMESTAMP`,
    [type === "like" ? "patik" : "nepatik", req.user.id, target.id],
  );
  let match = false;
  if (type === "like") {
    const reciprocal = await pool.query(
      `SELECT 1 FROM reakcija r JOIN anketa p ON p.id = r.anketa_id
       WHERE r.lietotajs_id = $1 AND p.lietotajs_id = $2 AND p.spele_id = $3
         AND p.ir_dzesta = FALSE AND r.tips = 'patik'`,
      [target.lietotajs_id, req.user.id, Number(req.params.gameId)],
    );
    match = reciprocal.rowCount > 0;
  }
  res.json({ match });
}

export async function reportProfile(req, res) {
  const reason = req.body.reason;
  if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) {
    return res.status(400).json({ error: "Report reason must contain 1 to 1000 characters." });
  }
  const { rows } = await pool.query(
    "SELECT id FROM anketa WHERE id = $1 AND spele_id = $2 AND ir_dzesta = FALSE AND lietotajs_id <> $3",
    [Number(req.params.profileId), Number(req.params.gameId), req.user.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Profile not found." });
  await pool.query(
    `INSERT INTO zinojums (pamatojums, anketa_id, lietotajs_id) VALUES ($1, $2, $3)
     ON CONFLICT (lietotajs_id, anketa_id)
     DO UPDATE SET pamatojums = EXCLUDED.pamatojums, datums = CURRENT_TIMESTAMP, admin_id = NULL`,
    [reason.trim(), rows[0].id, req.user.id],
  );
  res.status(201).json({ message: "Report submitted." });
}