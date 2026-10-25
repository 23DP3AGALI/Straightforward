import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, withTransaction } from "../config/db.js";

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "12h" });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    nick: user.nick,
    age: user.age == null ? null : Number(user.age),
    kontakt_informacija: user.kontakt_informacija,
    avatar: user.avatar || "",
    ir_banots: user.ir_banots,
    isAdmin: user.is_admin,
  };
}

export async function register(req, res) {
  const { email, nick, kontakt_informacija = "", password, age } = req.body;
  if (typeof email !== "string" || email.trim().length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (typeof nick !== "string" || !/^[A-Za-z0-9_]{2,50}$/.test(nick.trim())) {
    return res.status(400).json({ error: "Nickname must contain 2 to 50 English letters, numbers, or underscores." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must contain at least 8 characters." });
  }
  if (!Number.isInteger(Number(age)) || Number(age) < 12 || Number(age) > 99) {
    return res.status(400).json({ error: "Age must be an integer between 12 and 99." });
  }
  if (typeof kontakt_informacija !== "string" || kontakt_informacija.length > 200) {
    return res.status(400).json({ error: "Contact information must be at most 200 characters." });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNick = nick.trim();
    const existing = await db.query(
      "SELECT id FROM lietotajs WHERE email = ? OR nick = ? LIMIT 1",
      [normalizedEmail, normalizedNick],
    );
    if (existing.rows[0]) return res.status(409).json({ error: "Email or nickname is already in use." });

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await db.query(
      `INSERT INTO lietotajs (email, nick, age, kontakt_informacija, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [
        normalizedEmail,
        normalizedNick,
        Number(age),
        kontakt_informacija.trim() || null,
        passwordHash,
      ],
    );
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.nick, u.age, u.kontakt_informacija, u.avatar,
              EXISTS (SELECT 1 FROM admin a WHERE a.id = u.id) AS is_admin,
              EXISTS (SELECT 1 FROM lietotaja_bans b WHERE b.lietotajs_id = u.id
                AND b.ir_aktivs = 'ir' AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP)) AS ir_banots
       FROM lietotajs u WHERE u.id = ?`,
      [created.insertId],
    );
    const user = rows[0];
    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email or nickname is already in use." });
    throw error;
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.nick, u.age, u.kontakt_informacija, u.avatar, u.password_hash,
            EXISTS (SELECT 1 FROM admin a WHERE a.id = u.id) AS is_admin,
            EXISTS (SELECT 1 FROM lietotaja_bans b WHERE b.lietotajs_id = u.id
              AND b.ir_aktivs = 'ir' AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP)) AS ir_banots
     FROM lietotajs u WHERE lower(u.email) = lower(?)`,
    [email.trim()],
  );
  const user = rows[0];
  if (!user || typeof user.password_hash !== "string" || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  if (user.ir_banots) return res.status(403).json({ error: "This account is banned." });
  return res.json({ token: createToken(user), user: publicUser(user) });
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function updateMe(req, res) {
  const { email, nick, age, contact = "", avatar = "", currentPassword, newPassword } = req.body;
  const passwordToSet = newPassword === "" ? null : newPassword;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 100) {
    return res.status(400).json({ error: "Enter a valid email address of at most 100 characters." });
  }
  if (typeof nick !== "string" || nick.trim().length < 2 || nick.trim().length > 50
    || (nick.trim() !== req.user.nick && !/^[A-Za-z0-9_]+$/.test(nick.trim()))) {
    return res.status(400).json({ error: "Nickname must contain 2 to 50 English letters, numbers, or underscores." });
  }
  if (!Number.isInteger(Number(age)) || Number(age) < 12 || Number(age) > 99) {
    return res.status(400).json({ error: "Age must be an integer between 12 and 99." });
  }
  if (typeof contact !== "string" || contact.length > 200) {
    return res.status(400).json({ error: "Contact information must be at most 200 characters." });
  }
  if (typeof avatar !== "string" || avatar.length > 150_000
    || (avatar && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar))) {
    return res.status(400).json({ error: "Avatar must be a supported image under 150 KB." });
  }
  if (passwordToSet != null && (typeof passwordToSet !== "string" || passwordToSet.length < 8 || passwordToSet.length > 100)) {
    return res.status(400).json({ error: "New password must contain 8 to 100 characters." });
  }
  if (passwordToSet && typeof currentPassword !== "string") {
    return res.status(400).json({ error: "Enter your current password to change it." });
  }

  const { rows } = await db.query(
    "SELECT password_hash FROM lietotajs WHERE id = ?",
    [req.user.id],
  );
  const credentialsChanged = email.trim().toLowerCase() !== req.user.email.toLowerCase()
    || nick.trim() !== req.user.nick
    || Boolean(passwordToSet);
  if (credentialsChanged) {
    const passwordMatches = typeof currentPassword === "string"
      && typeof rows[0]?.password_hash === "string"
      && await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!passwordMatches) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }
  }

  try {
    const passwordHash = passwordToSet ? await bcrypt.hash(passwordToSet, 12) : null;
    await db.query(
      `UPDATE lietotajs
       SET email = ?, nick = ?, age = ?, kontakt_informacija = ?, avatar = ?,
           password_hash = COALESCE(?, password_hash)
       WHERE id = ?`,
      [
        email.trim().toLowerCase(), nick.trim(), Number(age), contact.trim() || null,
        avatar || null, passwordHash, req.user.id,
      ],
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email or nickname is already in use." });
    throw error;
  }
  const updated = {
    ...req.user,
    email: email.trim().toLowerCase(),
    nick: nick.trim(),
    age: Number(age),
    kontakt_informacija: contact.trim() || null,
    avatar: avatar || "",
  };
  res.json({ user: publicUser(updated) });
}

export async function ensureBootstrapAdmin() {
  const { ADMIN_EMAIL, ADMIN_NICK, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_NICK || !ADMIN_PASSWORD) return;

  await withTransaction(async (client) => {
    const lock = await client.query(
      "SELECT GET_LOCK(?, 10) AS acquired",
      ["straightforward:bootstrap-admin"],
    );
    if (lock.rows[0]?.acquired !== 1) {
      throw new Error("Could not acquire the bootstrap administrator lock.");
    }

    try {
      const admin = await client.query("SELECT id FROM admin LIMIT 1");
      if (admin.rows[0]) return;

      const existingUser = await client.query(
        "SELECT id, password_hash FROM lietotajs WHERE lower(email) = lower(?)",
        [ADMIN_EMAIL.trim()],
      );
      let userId = existingUser.rows[0]?.id;
      if (!existingUser.rows[0] || !existingUser.rows[0].password_hash) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        if (userId) {
          await client.query("UPDATE lietotajs SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
        } else {
          const inserted = await client.query(
            "INSERT INTO lietotajs (email, nick, password_hash) VALUES (?, ?, ?)",
            [ADMIN_EMAIL.trim().toLowerCase(), ADMIN_NICK.trim(), passwordHash],
          );
          userId = inserted.insertId;
        }
      }

      await client.query(
        "INSERT INTO admin (id, vards) VALUES (?, ?)",
        [userId, ADMIN_NICK.trim()],
      );
    } finally {
      await client.query("SELECT RELEASE_LOCK(?)", ["straightforward:bootstrap-admin"]);
    }
  });
}