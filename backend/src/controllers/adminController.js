import { db, withTransaction } from "../config/db.js";

export async function listReports(req, res) {
  const { rows } = await db.query(
    `SELECT r.id, r.pamatojums AS reason, r.datums AS createdAt, r.admin_id AS reviewedBy,
            reviewer_user.nick AS reviewedByNick, game.nosaukums AS gameName,
            p.id AS profileId, p.spele_id AS gameId, p.lietotajs_id AS reportedUserId,
            target.nick AS reportedNick,
            EXISTS (SELECT 1 FROM lietotaja_bans active_ban
                    WHERE active_ban.lietotajs_id = target.id AND active_ban.ir_aktivs = 'ir'
                      AND (active_ban.beigu_datums IS NULL OR active_ban.beigu_datums > CURRENT_TIMESTAMP)) AS isBanned,
            reporter.id AS reporterId, reporter.nick AS reporterNick
     FROM zinojums r JOIN anketa p ON p.id = r.anketa_id
     JOIN lietotajs target ON target.id = p.lietotajs_id
     JOIN lietotajs reporter ON reporter.id = r.lietotajs_id
     JOIN spele game ON game.id = p.spele_id
     LEFT JOIN lietotajs reviewer_user ON reviewer_user.id = r.admin_id
     ORDER BY (r.admin_id IS NULL) DESC, r.datums DESC`,
  );
  res.json({ reports: rows.map((report) => ({
    ...report,
    isBanned: Boolean(report.isBanned),
    reviewedBy: report.reviewedBy == null ? null : Number(report.reviewedBy),
  })) });
}

export async function listBans(req, res) {
  const { rows } = await db.query(
    `SELECT b.id, b.lietotajs_id AS userId, target.nick AS userNick,
            b.pamatojums AS reason, b.datums AS createdAt, b.beigu_datums AS endsAt,
            b.ir_aktivs AS activeStatus, b.admin_id AS adminId, admin_user.nick AS adminNick,
            (b.ir_aktivs = 'ir' AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP)) AS isActive
     FROM lietotaja_bans b
     JOIN lietotajs target ON target.id = b.lietotajs_id
     JOIN admin a ON a.id = b.admin_id
     JOIN lietotajs admin_user ON admin_user.id = a.id
     ORDER BY b.datums DESC
     LIMIT 200`,
  );
  res.json({ bans: rows.map((ban) => ({ ...ban, isActive: Boolean(ban.isActive) })) });
}

export async function reviewReport(req, res) {
  const { rowCount } = await db.query(
    "UPDATE zinojums SET admin_id = ? WHERE id = ?",
    [req.user.id, Number(req.params.reportId)],
  );
  if (!rowCount) {
    const { rows } = await db.query("SELECT id FROM zinojums WHERE id = ?", [Number(req.params.reportId)]);
    if (!rows[0]) return res.status(404).json({ error: "Report not found." });
  }
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
    const target = await client.query("SELECT id FROM lietotajs WHERE id = ?", [userId]);
    if (!target.rows[0]) return null;
    const inserted = await client.query(
      `INSERT INTO lietotaja_bans (pamatojums, beigu_datums, ir_aktivs, lietotajs_id, admin_id)
       VALUES (?, ?, 'ir', ?, ?)`,
      [reason.trim(), endsAt, userId, req.user.id],
    );
    await client.query("UPDATE lietotajs SET ir_banots = TRUE WHERE id = ?", [userId]);
    const { rows } = await client.query(
      "SELECT id, datums, beigu_datums FROM lietotaja_bans WHERE id = ?",
      [inserted.insertId],
    );
    return rows[0];
  });
  if (!ban) return res.status(404).json({ error: "User not found." });
  res.status(201).json({ ban });
}

export async function liftBan(req, res) {
  const userId = Number(req.params.userId);
  const lifted = await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE lietotaja_bans SET ir_aktivs = 'nav' WHERE id = ? AND lietotajs_id = ? AND ir_aktivs = 'ir'",
      [Number(req.params.banId), userId],
    );
    if (!result.rowCount) return false;
    const active = await client.query(
      `SELECT 1 FROM lietotaja_bans WHERE lietotajs_id = ? AND ir_aktivs = 'ir'
       AND (beigu_datums IS NULL OR beigu_datums > CURRENT_TIMESTAMP)`,
      [userId],
    );
    await client.query("UPDATE lietotajs SET ir_banots = ? WHERE id = ?", [active.rowCount > 0, userId]);
    return true;
  });
  if (!lifted) return res.status(404).json({ error: "Active ban not found." });
  res.json({ lifted: true });
}

export async function grantAdmin(req, res) {
  const nick = req.body?.nick;
  if (typeof nick !== "string" || !/^[A-Za-z0-9_]{2,50}$/.test(nick.trim())) {
    return res.status(400).json({ error: "Enter a valid nickname." });
  }

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      "SELECT id, nick FROM lietotajs WHERE LOWER(nick) = LOWER(?) FOR UPDATE",
      [nick.trim()],
    );
    const target = rows[0];
    if (!target) return { status: "missing" };
    const existing = await client.query("SELECT id FROM admin WHERE id = ?", [target.id]);
    if (existing.rows[0]) return { status: "already-admin", user: target };
    await client.query("INSERT INTO admin (id, vards) VALUES (?, ?)", [target.id, target.nick]);
    return { status: "granted", user: target };
  });

  if (result.status === "missing") return res.status(404).json({ error: "User with this nickname was not found." });
  res.status(result.status === "granted" ? 201 : 200).json({
    user: { ...result.user, isAdmin: true },
    alreadyAdmin: result.status === "already-admin",
  });
}

export async function revokeAdmin(req, res) {
  const nick = req.params.nick;
  if (typeof nick !== "string" || !/^[A-Za-z0-9_]{2,50}$/.test(nick)) {
    return res.status(400).json({ error: "Enter a valid nickname." });
  }

  const { rows } = await db.query(
    "SELECT id, nick FROM lietotajs WHERE LOWER(nick) = LOWER(?)",
    [nick],
  );
  const target = rows[0];
  if (!target) return res.status(404).json({ error: "User with this nickname was not found." });
  if (String(target.id) === String(req.user.id)) {
    return res.status(400).json({ error: "You cannot remove your own administrator access." });
  }

  const result = await db.query("DELETE FROM admin WHERE id = ?", [target.id]);
  if (!result.rowCount) return res.status(404).json({ error: "This user is not an administrator." });
  res.json({ user: { id: target.id, nick: target.nick, isAdmin: false } });
}