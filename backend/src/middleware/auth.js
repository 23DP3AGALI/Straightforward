import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: "Authentication required." });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  const { rows } = await db.query(
    `SELECT u.id, u.email, u.nick, u.kontakt_informacija, u.avatar, u.age,
            EXISTS (SELECT 1 FROM lietotaja_bans b WHERE b.lietotajs_id = u.id
              AND b.ir_aktivs = 'ir' AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP)) AS is_banned,
            EXISTS (SELECT 1 FROM admin a WHERE a.id = u.id) AS is_admin
     FROM lietotajs u WHERE u.id = ?`,
    [payload.sub],
  );
  if (!rows[0]) return res.status(401).json({ error: "Invalid session." });
  if (rows[0].is_banned) return res.status(403).json({ error: "This account is banned." });
  req.user = {
    ...rows[0],
    ir_banots: rows[0].is_banned,
    isAdmin: Boolean(rows[0].is_admin),
  };
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: "Administrator access required." });
  next();
}