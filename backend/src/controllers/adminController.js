import { pool, withTransaction } from "../config/db.js";

export async function listReports(req, res) {
  const { rows } = await pool.query(
    `SELECT r.id, r.pamatojums AS reason, r.datums AS "createdAt", r.admin_id AS "reviewedBy",
            p.id AS "profileId", p.spele_id AS "gameId", p.lietotajs_id AS "reportedUserId",
            target.nick AS "reportedNick", reporter.id AS "reporterId", reporter.nick AS "reporterNick"
     FROM zinojums r JOIN anketa p ON p.id = r.anketa_id
     JOIN lietotajs target ON target.id = p.lietotajs_id
     JOIN lietotajs reporter ON reporter.id = r.lietotajs_id
     ORDER BY (r.admin_id IS NULL) DESC, r.datums DESC`,
  );
  res.json({ reports: rows });
}

export async function reviewReport(req, res) {
  const { rows } = await pool.query(
    "UPDATE zinojums SET admin_id = $1 WHERE id = $2 RETURNING id",
    [req.user.id, Number(req.params.reportId)],
  );
  if (!rows[0]) return res.status(404).json({ error: "Report not found." });
  res.json({ reviewed: true });
}

export async function banUser(req, res) {
  const userId = Number(req.params.userId);
  const { reason, endsAt = null } = req.body;
  if (!Number.isInteger(userId) || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "A user id and ban reason are required." });
  }
  if (endsAt != null && (Number.isNaN(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.now())) {
    return res.status(400).json({ error: "Ban end date must be in the future." });
  }
  if (userId === req.user.id) return res.status(400).json({ error: "You cannot ban your own account." });

  const ban = await withTransaction(async (client) => {
    const target = await client.query("SELECT id FROM lietotajs WHERE id = $1", [userId]);
    if (!target.rows[0]) return null;
    const inserted = await client.query(
      `INSERT INTO lietotaja_bans (pamatojums, beigu_datums, ir_aktivs, lietotajs_id, admin_id)
       VALUES ($1, $2, 'ir', $3, $4) RETURNING id, datums, beigu_datums`,
      [reason.trim(), endsAt, userId, req.user.id],
    );
    await client.query("UPDATE lietotajs SET ir_banots = TRUE WHERE id = $1", [userId]);
    return inserted.rows[0];
  });
  if (!ban) return res.status(404).json({ error: "User not found." });
  res.status(201).json({ ban });
}

export async function liftBan(req, res) {
  const userId = Number(req.params.userId);
  const lifted = await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE lietotaja_bans SET ir_aktivs = 'nav' WHERE id = $1 AND lietotajs_id = $2 AND ir_aktivs = 'ir' RETURNING id",
      [Number(req.params.banId), userId],
    );
    if (!result.rowCount) return false;
    const active = await client.query(
      `SELECT 1 FROM lietotaja_bans WHERE lietotajs_id = $1 AND ir_aktivs = 'ir'
       AND (beigu_datums IS NULL OR beigu_datums > CURRENT_TIMESTAMP)`,
      [userId],
    );
    await client.query("UPDATE lietotajs SET ir_banots = $1 WHERE id = $2", [active.rowCount > 0, userId]);
    return true;
  });
  if (!lifted) return res.status(404).json({ error: "Active ban not found." });
  res.json({ lifted: true });
}