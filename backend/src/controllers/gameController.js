import { pool, withTransaction } from "../config/db.js";

const toDbType = { text: "teksts", number: "skaitlis", select: "izvele", checkbox: "atzimes_rukis" };
const fromDbType = Object.fromEntries(Object.entries(toDbType).map(([key, value]) => [value, key]));

async function gameWithFields(queryable, id) {
  const gameResult = await queryable.query("SELECT id, nosaukums, attels FROM spele WHERE id = $1", [id]);
  const game = gameResult.rows[0];
  if (!game) return null;
  const fieldsResult = await queryable.query(
    `SELECT f.id, f.nosaukums, f.lauka_tips, f.ir_obligats,
            COALESCE(array_agg(v.vertiba) FILTER (WHERE v.id IS NOT NULL), '{}') AS options
     FROM speles_lauks f LEFT JOIN speles_lauka_variants v ON v.speles_lauks_id = f.id
     WHERE f.spele_id = $1 GROUP BY f.id ORDER BY f.id`,
    [id],
  );
  return {
    id: game.id,
    name: game.nosaukums,
    image: game.attels,
    fields: fieldsResult.rows.map((field) => ({
      id: field.id,
      name: field.nosaukums,
      type: fromDbType[field.lauka_tips],
      required: field.ir_obligats,
      options: field.options,
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
      const updated = await client.query(
        `UPDATE speles_lauks SET nosaukums = $1, lauka_tips = $2, ir_obligats = $3
         WHERE id = $4 AND spele_id = $5 RETURNING id`,
        [field.name.trim(), toDbType[field.type], Boolean(field.required), Number(field.id), gameId],
      );
      fieldId = updated.rows[0]?.id;
    }
    if (!fieldId) {
      const inserted = await client.query(
        "INSERT INTO speles_lauks (spele_id, nosaukums, lauka_tips, ir_obligats) VALUES ($1, $2, $3, $4) RETURNING id",
        [gameId, field.name.trim(), toDbType[field.type], Boolean(field.required)],
      );
      fieldId = inserted.rows[0].id;
    }
    kept.push(fieldId);
    const options = Array.isArray(field.options) ? field.options : String(field.options || "").split(",");
    await client.query("DELETE FROM speles_lauka_variants WHERE speles_lauks_id = $1", [fieldId]);
    for (const option of [...new Set(options.map((value) => String(value).trim()).filter(Boolean))]) {
      await client.query("INSERT INTO speles_lauka_variants (speles_lauks_id, vertiba) VALUES ($1, $2)", [fieldId, option.slice(0, 100)]);
    }
  }
  if (kept.length) {
    await client.query("DELETE FROM speles_lauks WHERE spele_id = $1 AND NOT (id = ANY($2::int[]))", [gameId, kept]);
  } else {
    await client.query("DELETE FROM speles_lauks WHERE spele_id = $1", [gameId]);
  }
}

export async function listGames(req, res) {
  const { rows } = await pool.query("SELECT id FROM spele ORDER BY nosaukums");
  res.json({ games: await Promise.all(rows.map(({ id }) => gameWithFields(pool, id))) });
}

export async function getGame(req, res) {
  const game = await gameWithFields(pool, Number(req.params.id));
  if (!game) return res.status(404).json({ error: "Game not found." });
  res.json({ game });
}

export async function createGame(req, res) {
  const error = validateGame(req.body);
  if (error) return res.status(400).json({ error });
  const game = await withTransaction(async (client) => {
    const inserted = await client.query(
      "INSERT INTO spele (nosaukums, attels, admin_id) VALUES ($1, $2, $3) RETURNING id",
      [req.body.name.trim(), req.body.image || null, req.user.id],
    );
    if (req.body.fields) await syncFields(client, inserted.rows[0].id, req.body.fields);
    return gameWithFields(client, inserted.rows[0].id);
  });
  res.status(201).json({ game });
}

export async function updateGame(req, res) {
  const error = validateGame(req.body, false);
  if (error) return res.status(400).json({ error });
  const id = Number(req.params.id);
  const game = await withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE spele SET nosaukums = COALESCE($1, nosaukums),
                        attels = CASE WHEN $2 THEN $3 ELSE attels END
       WHERE id = $4 RETURNING id`,
      [req.body.name?.trim() || null, Object.hasOwn(req.body, "image"), req.body.image || null, id],
    );
    if (!updated.rows[0]) return null;
    if (req.body.fields) await syncFields(client, id, req.body.fields);
    return gameWithFields(client, id);
  });
  if (!game) return res.status(404).json({ error: "Game not found." });
  res.json({ game });
}

export async function deleteGame(req, res) {
  const result = await pool.query("DELETE FROM spele WHERE id = $1", [Number(req.params.id)]);
  if (!result.rowCount) return res.status(404).json({ error: "Game not found." });
  res.status(204).end();
}