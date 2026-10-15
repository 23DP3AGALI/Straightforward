import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, withTransaction } from "../config/db.js";

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "12h" });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    nick: user.nick,
    kontakt_informacija: user.kontakt_informacija,
    ir_banots: user.ir_banots,
    isAdmin: user.is_admin,
  };
}

export async function register(req, res) {
  const { email, nick, kontakt_informacija = "", password } = req.body;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (typeof nick !== "string" || nick.trim().length < 2 || nick.trim().length > 50) {
    return res.status(400).json({ error: "Nickname must contain 2 to 50 characters." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must contain at least 8 characters." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO lietotajs (email, nick, kontakt_informacija, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nick, kontakt_informacija, ir_banots`,
      [email.trim().toLowerCase(), nick.trim(), String(kontakt_informacija).trim() || null, passwordHash],
    );
    const user = { ...rows[0], is_admin: false };
    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Email or nickname is already in use." });
    throw error;
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.nick, u.kontakt_informacija, u.password_hash,
            EXISTS (SELECT 1 FROM admin a WHERE a.id = u.id) AS is_admin,
            EXISTS (SELECT 1 FROM lietotaja_bans b WHERE b.lietotajs_id = u.id
              AND b.ir_aktivs = 'ir' AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP)) AS ir_banots
     FROM lietotajs u WHERE lower(u.email) = lower($1)`,
    [email.trim()],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  if (user.ir_banots) return res.status(403).json({ error: "This account is banned." });
  return res.json({ token: createToken(user), user: publicUser(user) });
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function ensureBootstrapAdmin() {
  const { ADMIN_EMAIL, ADMIN_NICK, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_NICK || !ADMIN_PASSWORD) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await withTransaction(async (client) => {
    const existing = await client.query("SELECT id FROM lietotajs WHERE lower(email) = lower($1)", [ADMIN_EMAIL.trim()]);
    let userId = existing.rows[0]?.id;
    if (!userId) {
      const inserted = await client.query(
        "INSERT INTO lietotajs (email, nick, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [ADMIN_EMAIL.trim().toLowerCase(), ADMIN_NICK.trim(), passwordHash],
      );
      userId = inserted.rows[0].id;
    }
    await client.query("INSERT INTO admin (id, vards) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [userId, ADMIN_NICK.trim()]);
  });
}