import { db, withTransaction } from "../config/db.js";

const toDbType = { text: "teksts", number: "skaitlis", select: "izvele", checkbox: "atzimes_rukis" };
const fromDbType = Object.fromEntries(Object.entries(toDbType).map(([key, value]) => [value, key]));

async function gameWithFields(queryable, id) {
  const gameResult = await queryable.query("SELECT id, nosaukums, attels FROM spele WHERE id = ?", [id]);
  const game = gameResult.rows[0];
  if (!game) return null;
  const fieldsResult = await queryable.query(
    `SELECT f.id, f.nosaukums, f.lauka_tips, f.ir_obligats, v.vertiba AS option_value
     FROM speles_lauks f LEFT JOIN speles_lauka_variants v ON v.speles_lauks_id = f.id
     WHERE f.spele_id = ? ORDER BY f.id, v.id`,
    [id],
  );
  const fieldsById = new Map();
  for (const field of fieldsResult.rows) {
    if (!fieldsById.has(field.id)) {
      fieldsById.set(field.id, {
        id: field.id,
        name: field.nosaukums,
        type: fromDbType[field.lauka_tips],
        required: Boolean(field.ir_obligats),
        options: [],
      });
    }
    if (field.option_value !== null) fieldsById.get(field.id).options.push(field.option_value);
  }
  return {
    id: game.id,
    name: game.nosaukums,
    image: game.attels,
    fields: [...fieldsById.values()].map((field) => ({
      ...field,
      optionsText: field.options.join(", "),
    })),
  };
}

function validateGame(body, requireName = true) {
  if (requireName && (typeof body.name !== "string" || !body.name.trim())) return "Game name is required.";
  if (body.name != null && typeof body.name !== "string") return "Game name must be text.";
  if (body.name != null && body.name.trim().length > 100) return "Game name must be at most 100 characters.";
  if (body.image != null && (typeof body.image !== "string" || body.image.length > 500)) return "Image URL must be at most 500 characters.";
  if (body.fields != null && !Array.isArray(body.fields)) return "Fields must be an array.";
  for (const field of body.fields || []) {
    if (typeof field.name !== "string" || !field.name.trim() || field.name.trim().length > 50) return "Each field needs a name of at most 50 characters.";
    if (!toDbType[field.type]) return "Field type is invalid.";
    if (field.options != null && !Array.isArray(field.options) && typeof field.options !== "string") return "Field options must be a string or array.";
  }
  return null;
}

async function syncFields(client, gameId, fields) {
  const kept = [];
  for (const field of fields) {
    let fieldId;
    if (Number.isInteger(Number(field.id)) && Number(field.id) > 0) {
      const existing = await client.query(
        "SELECT id FROM speles_lauks WHERE id = ? AND spele_id = ?",
        [Number(field.id), gameId],
      );
      if (existing.rows[0]) {
        fieldId = existing.rows[0].id;
        await client.query(
          `UPDATE speles_lauks SET nosaukums = ?, lauka_tips = ?, ir_obligats = ?
           WHERE id = ? AND spele_id = ?`,
          [field.name.trim(), toDbType[field.type], Boolean(field.required), fieldId, gameId],
        );
      }
    }
    if (!fieldId) {
      const inserted = await client.query(
        "INSERT INTO speles_lauks (spele_id, nosaukums, lauka_tips, ir_obligats) VALUES (?, ?, ?, ?)",
        [gameId, field.name.trim(), toDbType[field.type], Boolean(field.required)],
      );
      fieldId = inserted.insertId;
    }
    kept.push(fieldId);
    const options = Array.isArray(field.options) ? field.options : String(field.options || "").split(",");
    await client.query("DELETE FROM speles_lauka_variants WHERE speles_lauks_id = ?", [fieldId]);
    for (const option of [...new Set(options.map((value) => String(value).trim()).filter(Boolean))]) {
      await client.query("INSERT INTO speles_lauka_variants (speles_lauks_id, vertiba) VALUES (?, ?)", [fieldId, option.slice(0, 100)]);
    }
  }
  if (kept.length) {
    const placeholders = kept.map(() => "?").join(", ");
    await client.query(
      `DELETE FROM speles_lauks WHERE spele_id = ? AND id NOT IN (${placeholders})`,
      [gameId, ...kept],
    );
  } else {
    await client.query("DELETE FROM speles_lauks WHERE spele_id = ?", [gameId]);
  }
}

export async function listGames(req, res) {
  const { rows } = await db.query("SELECT id FROM spele ORDER BY nosaukums");
  const { rows: activity } = await db.query(
    `SELECT g.id,
            (SELECT COUNT(*) FROM anketa p
             WHERE p.spele_id = g.id AND p.ir_dzesta = FALSE
               AND NOT EXISTS (
                 SELECT 1 FROM lietotaja_bans b
                 WHERE b.lietotajs_id = p.lietotajs_id AND b.ir_aktivs = 'ir'
                   AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP)
               ))
              AS active_players,
            (SELECT COUNT(*) FROM team_lobby l
             WHERE l.game_id = g.id AND l.status = 'open') AS open_lobbies
     FROM spele g`,
  );
  const activityByGame = new Map(activity.map((row) => [String(row.id), {
    activePlayers: Number(row.active_players),
    openLobbies: Number(row.open_lobbies),
  }]));
  res.json({
    games: await Promise.all(rows.map(async ({ id }) => ({
      ...(await gameWithFields(db, id)),
      ...activityByGame.get(String(id)),
    }))),
  });
}

export async function getGame(req, res) {
  const game = await gameWithFields(db, Number(req.params.id));
  if (!game) return res.status(404).json({ error: "Game not found." });
  res.json({ game });
}

export async function createGame(req, res) {
  const error = validateGame(req.body);
  if (error) return res.status(400).json({ error });
  const game = await withTransaction(async (client) => {
    const inserted = await client.query(
      "INSERT INTO spele (nosaukums, attels, admin_id) VALUES (?, ?, ?)",
      [req.body.name.trim(), req.body.image || null, req.user.id],
    );
    if (req.body.fields) await syncFields(client, inserted.insertId, req.body.fields);
    return gameWithFields(client, inserted.insertId);
  });
  res.status(201).json({ game });
}

export async function updateGame(req, res) {
  const error = validateGame(req.body, false);
  if (error) return res.status(400).json({ error });
  const id = Number(req.params.id);
  const game = await withTransaction(async (client) => {
    const existing = await client.query("SELECT id FROM spele WHERE id = ?", [id]);
    if (!existing.rows[0]) return null;
    await client.query(
      `UPDATE spele SET nosaukums = COALESCE(?, nosaukums),
                        attels = CASE WHEN ? THEN ? ELSE attels END
       WHERE id = ?`,
      [req.body.name?.trim() || null, Object.hasOwn(req.body, "image"), req.body.image || null, id],
    );
    if (req.body.fields) await syncFields(client, id, req.body.fields);
    return gameWithFields(client, id);
  });
  if (!game) return res.status(404).json({ error: "Game not found." });
  res.json({ game });
}

export async function deleteGame(req, res) {
  const result = await db.query("DELETE FROM spele WHERE id = ?", [Number(req.params.id)]);
  if (!result.rowCount) return res.status(404).json({ error: "Game not found." });
  res.status(204).end();
}